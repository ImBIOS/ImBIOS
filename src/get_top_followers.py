import json
import os
import re
import sys
import time
from typing import Callable, Option

import requests


def is_debug_logging_enabled() -> bool:
    """
    Check if debug logging is enabled.
    """
    return (
        os.getenv("ACTIONS_STEP_DEBUG") == "true"
        or os.getenv("ACTIONS_RUNNER_DEBUG") == "true"
    )


def retry_request(
    request_func: Callable[[], requests.Response], retries: int = 3
) -> requests.Response:
    """
    Retry the request with exponential backoff for rate-limited responses.
    """
    for attempt in range(1, retries + 1):
        response = request_func()
        if response.ok:
            return response
        if response.status_code == 403 and "rate limit" in response.text.lower():
            wait_time = 2**attempt  # Exponential backoff
            print(
                f"Rate limited. Waiting for {wait_time} seconds (Attempt {attempt})..."
            )
            time.sleep(wait_time)
        else:
            break
    response.raise_for_status()


def handle_api_errors(response: requests.Response) -> None:
    """
    Handle API errors by raising appropriate exceptions or exiting.
    """
    if not response.ok:
        if response.status_code == 500:
            print("Server Error: Retrying is unlikely to help.")
            raise SystemExit("API returned 500 Internal Server Error.")
        response.raise_for_status()


def fetch_followers(handle: str, headers: dict, cursor: Optional[str]) -> dict:
    """
    Fetch followers of a GitHub user using the GraphQL API.
    """
    query = f"""
query {{
    user(login: "{handle}") {{
        followers(first: 10{f', after: "{cursor}"' if cursor else ''}) {{
            pageInfo {{
                endCursor
                hasNextPage
            }}
            nodes {{
                login
                name
                databaseId
                following {{
                    totalCount
                }}
                repositories(first: 3, isFork: false, orderBy: {{
                    field: STARGAZERS,
                    direction: DESC
                }}) {{
                    totalCount
                    nodes {{
                        stargazerCount
                    }}
                }}
                followers {{
                    totalCount
                }}
                contributionsCollection {{
                    contributionCalendar {{
                        totalContributions
                    }}
                }}
            }}
        }}
    }}
}}
"""
    response = retry_request(
        lambda: requests.post(
            "https://api.github.com/graphql",
            json={"query": query},
            headers=headers,
        )
    )
    handle_api_errors(response)
    return response.json()


def generate_html_table(followers: list[tuple[int, str, int, str]]) -> str:
    """
    Generate an HTML table for the followers list.
    """
    html = "<table>\n"
    for i in range(min(len(followers), 21)):
        login, user_id, name = followers[i][1], followers[i][2], followers[i][3]
        if i % 7 == 0:
            if i != 0:
                html += "  </tr>\n"
            html += "  <tr>\n"
        html += f"""    <td align="center">
      <a href="https://github.com/{login}">
        <img src="https://avatars2.githubusercontent.com/u/{user_id}" width="100px;" alt="{login}"/>
      </a>
      <br />
      <a href="https://github.com/{login}">{name}</a>
    </td>
"""
    html += "  </tr>\n</table>"
    return html


def update_readme(readme_path: str, html_content: str) -> None:
    """
    Update the README.md file with the generated HTML content.
    """
    with open(readme_path, "r", encoding="utf-8") as readme:
        content = readme.read()

    new_content = re.sub(
        r"(?<=<!\-\-START_SECTION:top\-followers\-\->)[\s\S]*(?=<!\-\-END_SECTION:top\-followers\-\->)",
        f"\n{html_content}\n",
        content,
    )

    with open(readme_path, "w", encoding="utf-8") as readme:
        readme.write(new_content)


def main() -> None:
    """
    Main function to fetch the top followers and update the README.md file.
    """
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: python get_top_followers.py <GitHub handle> <token> <README path>"
        )

    handle, token, readme_path = sys.argv[1], sys.argv[2], sys.argv[3]
    headers = {"Authorization": f"Bearer {token}"}

    followers = []
    cursor = None

    while True:
        data = fetch_followers(handle, headers, cursor)
        user_followers = data["data"]["user"]["followers"]
        for follower in user_followers["nodes"]:
            following = follower["following"]["totalCount"]
            repo_count = follower["repositories"]["totalCount"]
            login = follower["login"]
            name = follower["name"]
            user_id = follower["databaseId"]
            follower_number = follower["followers"]["totalCount"]
            third_stars = (
                follower["repositories"]["nodes"][2]["stargazerCount"]
                if repo_count >= 3
                else 0
            )
            contribution_count = follower["contributionsCollection"][
                "contributionCalendar"
            ]["totalContributions"]
            if (
                following > third_stars * 50 + repo_count * 5 + follower_number
                or contribution_count < 5
            ):
                if is_debug_logging_enabled():
                    print(
                        f"Skipped{'*' if follower_number > 300 else ''}: https://github.com/{login} with {follower_number} followers and {following} following"
                    )
                continue
            followers.append((follower_number, login, user_id, name or login))
            if is_debug_logging_enabled():
                print(followers[-1])

        print(f"Processed {len(followers)} followers")
        if not user_followers["pageInfo"]["hasNextPage"]:
            break
        cursor = user_followers["pageInfo"]["endCursor"]

    followers.sort(reverse=True)
    html_content = generate_html_table(followers)
    update_readme(readme_path, html_content)


if __name__ == "__main__":
    main()
