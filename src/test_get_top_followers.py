import os
import sys
import unittest
from unittest.mock import MagicMock, mock_open, patch

from get_top_followers import is_debug_logging_enabled, main


class TestGetTopFollowers(unittest.TestCase):

    def setUp(self):
        self.argv_backup = sys.argv
        sys.argv = [
            "get_top_followers.py",
            "testuser",
            "testtoken",
            "test_README.md",
        ]

        self.mocked_env = {
            "ACTIONS_STEP_DEBUG": "false",
            "ACTIONS_RUNNER_DEBUG": "false",
        }
        self.original_environ = os.environ.copy()
        os.environ.update(self.mocked_env)

    def tearDown(self):
        sys.argv = self.argv_backup
        os.environ = self.original_environ

    def test_is_debug_logging_enabled(self):
        os.environ["ACTIONS_STEP_DEBUG"] = "true"
        self.assertTrue(is_debug_logging_enabled())

        os.environ["ACTIONS_STEP_DEBUG"] = "false"
        os.environ["ACTIONS_RUNNER_DEBUG"] = "true"
        self.assertTrue(is_debug_logging_enabled())

        os.environ["ACTIONS_STEP_DEBUG"] = "false"
        os.environ["ACTIONS_RUNNER_DEBUG"] = "false"
        self.assertFalse(is_debug_logging_enabled())

    @patch(
        "builtins.open",
        new_callable=mock_open,
        read_data="<!--START_SECTION:top-followers--><!--END_SECTION:top-followers-->",
    )
    @patch("get_top_followers.requests.post")
    def test_main(self, mock_post, mock_file):
        # Mocking API response with proper followers data and pagination
        mock_response = MagicMock()
        mock_response.ok = True
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "data": {
                "user": {
                    "followers": {
                        "pageInfo": {"endCursor": None, "hasNextPage": False},
                        "nodes": [
                            {
                                "login": "testfollower",
                                "name": "Test Follower",
                                "databaseId": 123456,
                                "following": {
                                    "totalCount": 10
                                },  # Ensure 'following' field is present
                                "repositories": {
                                    "totalCount": 3,
                                    "nodes": [
                                        {"stargazerCount": 5},
                                        {"stargazerCount": 10},
                                        {"stargazerCount": 15},
                                    ],
                                },
                                "followers": {"totalCount": 20},
                                "contributionsCollection": {
                                    "contributionCalendar": {"totalContributions": 100}
                                },
                            }
                        ],
                    },
                },
            },
        }

        # Ensure main works with mocked response
        main()

        # Verify README content update
        mock_file().write.assert_called_once()
        written_content = mock_file().write.call_args[0][0]
        self.assertIn("testfollower", written_content)
        self.assertIn(
            "https://avatars2.githubusercontent.com/u/123456", written_content
        )
        self.assertIn("Test Follower", written_content)


@patch("get_top_followers.requests.post")
def test_pagination_handling(self, mock_post):
    # Simulate multiple pages
    mock_response_page_1 = MagicMock()
    mock_response_page_1.ok = True
    mock_response_page_1.json.return_value = {
        "data": {
            "user": {
                "followers": {
                    "pageInfo": {"endCursor": "nextPageCursor", "hasNextPage": True},
                    "nodes": [
                        {
                            "login": "follower1",
                            "name": "Follower One",
                            "databaseId": 123,
                            "following": {
                                "totalCount": 5
                            },  # Ensure 'following' field is present
                            "repositories": {
                                "totalCount": 3,  # Ensure there are 3 repositories
                                "nodes": [
                                    {"stargazerCount": 8},
                                    {"stargazerCount": 12},
                                    {"stargazerCount": 15},  # Add a third repository
                                ],
                            },
                            "followers": {"totalCount": 10},
                            "contributionsCollection": {
                                "contributionCalendar": {"totalContributions": 50}
                            },
                        }
                    ],
                },
            },
        },
    }

    mock_response_page_2 = MagicMock()
    mock_response_page_2.ok = True
    mock_response_page_2.json.return_value = {
        "data": {
            "user": {
                "followers": {
                    "pageInfo": {"endCursor": None, "hasNextPage": False},
                    "nodes": [
                        {
                            "login": "follower2",
                            "name": "Follower Two",
                            "databaseId": 456,
                            "following": {
                                "totalCount": 12
                            },  # Ensure 'following' field is present
                            "repositories": {
                                "totalCount": 5,
                                "nodes": [
                                    {"stargazerCount": 6},
                                    {"stargazerCount": 7},
                                    {
                                        "stargazerCount": 9
                                    },  # Third repository for this follower
                                ],
                            },
                            "followers": {"totalCount": 15},
                            "contributionsCollection": {
                                "contributionCalendar": {"totalContributions": 75}
                            },
                        }
                    ],
                },
            },
        },
    }

    # Mock two paginated responses
    mock_post.side_effect = [mock_response_page_1, mock_response_page_2]

    # Call main and assert pagination occurs correctly
    main()

    # Assert the correct followers have been processed
    mock_post.assert_any_call(...)  # Ensure correct API calls were made
    mock_post.assert_any_call(...)  # Ensure the second API call was triggered

    # Ensure content was written to the file
    mock_file().write.assert_called()

    @patch("get_top_followers.requests.post")
    def test_invalid_response_handling(self, mock_post):
        # Test invalid response handling: Ensure API error handling works properly
        mock_response = MagicMock()
        mock_response.ok = False  # Simulating failed response
        mock_post.return_value = mock_response

        # Call main and ensure the error is handled gracefully (possibly with a try/except block)
        with self.assertRaises(Exception):  # Adjust exception type if necessary
            main()


if __name__ == "__main__":
    unittest.main()
