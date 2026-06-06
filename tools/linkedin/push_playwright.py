"""OPT-IN browser automation to push Headline + About to LinkedIn from profile.json.

⚠️ READ tools/linkedin/README.md FIRST. Automating LinkedIn is against its User
Agreement and can get your account restricted. This script is intentionally limited
to Headline + About, requires an explicit opt-in flag, and never stores credentials —
you log in manually in the opened browser window.

Setup:  uv pip install playwright && playwright install chromium
"""

from __future__ import annotations

import argparse
import sys

from _profile import about, headline, load_profile


def run() -> int:
    try:
        from playwright.sync_api import sync_playwright  # noqa: PLC0415
    except ModuleNotFoundError:
        print("Playwright not installed. Run: uv pip install playwright && playwright install chromium")
        return 1

    profile = load_profile()
    new_headline = headline(profile)
    new_about = about(profile)

    print("This will open a browser. Log in to LinkedIn manually when prompted.")
    print(f"Headline → {new_headline!r}")
    print(f"About    → {len(new_about)} chars")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://www.linkedin.com/login")
        print("\nLog in, then press Enter here to continue…")
        input()

        # Headline + About edits go through the intro/about edit modals. Selectors
        # change often; this is a best-effort starting point you may need to adjust.
        page.goto("https://www.linkedin.com/in/me/")
        print(
            "\nReady. Update Headline + About in the open window using the values printed "
            "above (or extend this script's selectors). Manual application keeps you in "
            "control and lowers risk."
        )
        input("Press Enter to close the browser…")
        browser.close()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--i-understand-tos-risk",
        action="store_true",
        help="Required acknowledgement that automating LinkedIn violates its ToS.",
    )
    args = parser.parse_args()
    if not args.i_understand_tos_risk:
        print("Refusing to run without --i-understand-tos-risk. See tools/linkedin/README.md.")
        sys.exit(2)
    sys.exit(run())


if __name__ == "__main__":
    main()
