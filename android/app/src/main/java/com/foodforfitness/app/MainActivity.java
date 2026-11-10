package com.foodforfitness.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;

import java.util.ArrayList;
import java.util.List;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1001;
	private static final int MEDIA_PERMISSION_REQUEST_CODE = 1002;
	private static final int FILE_CHOOSER_REQUEST_CODE = 1003;
	private PermissionRequest pendingMediaRequest;
	private ValueCallback<Uri[]> pendingFileCallback;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
			@Override
			public boolean onShowFileChooser(android.webkit.WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
				if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
				pendingFileCallback = filePathCallback;

				Intent chooserIntent = new Intent(Intent.ACTION_GET_CONTENT);
				chooserIntent.addCategory(Intent.CATEGORY_OPENABLE);
				chooserIntent.setType("image/*");
				startActivityForResult(Intent.createChooser(chooserIntent, "Select food photo"), FILE_CHOOSER_REQUEST_CODE);
				return true;
			}

			@Override
			public void onPermissionRequest(final PermissionRequest request) {
				if (!isTrustedWebViewOrigin(request)) {
					request.deny();
					return;
				}

				MainActivity.this.runOnUiThread(() -> handleMediaPermissionRequest(request));
			}
		});

		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
				&& checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
			requestPermissions(
					new String[]{Manifest.permission.POST_NOTIFICATIONS},
					NOTIFICATION_PERMISSION_REQUEST_CODE
			);
		}

	}

	private boolean isTrustedWebViewOrigin(PermissionRequest request) {
		String host = request.getOrigin().getHost();
		return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host);
	}

	private void handleMediaPermissionRequest(PermissionRequest request) {
		List<String> androidPermissions = new ArrayList<>();
		for (String resource : request.getResources()) {
			if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
					&& checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
				androidPermissions.add(Manifest.permission.CAMERA);
			}
			if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
					&& checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
				androidPermissions.add(Manifest.permission.RECORD_AUDIO);
			}
		}

		if (androidPermissions.isEmpty()) {
			request.grant(getAllowedMediaResources(request));
			return;
		}

		pendingMediaRequest = request;
		requestPermissions(androidPermissions.toArray(new String[0]), MEDIA_PERMISSION_REQUEST_CODE);
	}

	private String[] getAllowedMediaResources(PermissionRequest request) {
		List<String> resources = new ArrayList<>();
		for (String resource : request.getResources()) {
			if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
					&& checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
				resources.add(resource);
			}
			if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
					&& checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
				resources.add(resource);
			}
		}
		return resources.toArray(new String[0]);
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		if (requestCode != MEDIA_PERMISSION_REQUEST_CODE || pendingMediaRequest == null) return;

		PermissionRequest request = pendingMediaRequest;
		pendingMediaRequest = null;
		String[] allowedResources = getAllowedMediaResources(request);
		if (allowedResources.length > 0) request.grant(allowedResources);
		else request.deny();
	}

	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);
		if (requestCode != FILE_CHOOSER_REQUEST_CODE || pendingFileCallback == null) return;

		Uri[] results = resultCode == RESULT_OK && data != null && data.getData() != null
				? new Uri[]{data.getData()}
				: null;
		pendingFileCallback.onReceiveValue(results);
		pendingFileCallback = null;
	}
}
