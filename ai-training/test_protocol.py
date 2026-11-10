import unittest

from protocol import parse_generated_json


class GeneratedResponseTests(unittest.TestCase):
    def test_accepts_valid_answer(self):
        self.assertEqual(
            parse_generated_json('{"answer":"Kumain ng gulay.","needs_fallback":false}'),
            {"answer": "Kumain ng gulay.", "needs_fallback": False},
        )

    def test_accepts_fenced_json(self):
        self.assertEqual(
            parse_generated_json('```json\n{"answer":"Try monggo.","needs_fallback":false}\n```'),
            {"answer": "Try monggo.", "needs_fallback": False},
        )

    def test_requests_fallback_for_out_of_scope_question(self):
        self.assertEqual(
            parse_generated_json('{"answer":"","needs_fallback":true}'),
            {"answer": "", "needs_fallback": True},
        )

    def test_rejects_invalid_or_incomplete_json(self):
        self.assertIsNone(parse_generated_json("I am not sure"))
        self.assertIsNone(parse_generated_json('{"answer":"", "needs_fallback":false}'))
        self.assertIsNone(parse_generated_json('{"answer":"x","needs_fallback":"false"}'))


if __name__ == "__main__":
    unittest.main()
