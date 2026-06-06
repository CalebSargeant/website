"""Print copy-paste-ready LinkedIn sections from content/profile.json (ToS-safe)."""

from __future__ import annotations

from _profile import about, experience_blocks, headline, load_profile


def main() -> None:
    profile = load_profile()

    print("=" * 60)
    print("HEADLINE")
    print("=" * 60)
    print(headline(profile))

    print("\n" + "=" * 60)
    print("ABOUT")
    print("=" * 60)
    print(about(profile))

    print("\n" + "=" * 60)
    print("EXPERIENCE (one block per role)")
    print("=" * 60)
    for i, block in enumerate(experience_blocks(profile), 1):
        print(f"\n--- Role {i} ---")
        print(block)


if __name__ == "__main__":
    main()
