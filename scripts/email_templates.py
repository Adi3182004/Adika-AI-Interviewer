"""Recruiter outreach email template engine.

A tiny template engine (no Jinja dependency) tuned for the cadence the
Adika AI demo workspace ships with. Variables use ``{{name}}`` syntax;
unknown variables raise a clear error so a bad merge can't silently send.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from typing import Mapping


_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


@dataclass(frozen=True)
class Template:
    name: str
    subject: str
    body: str


TEMPLATES: dict[str, Template] = {
    "intro": Template(
        name="intro",
        subject="Open to chatting about {{role}} at {{company}}, {{first_name}}?",
        body=(
            "Hi {{first_name}},\n\n"
            "I came across your work on {{notable_project}} and was impressed by "
            "how you approached {{notable_skill}}.\n\n"
            "We're hiring a {{role}} at {{company}} — the team owns {{team_scope}} "
            "and is looking for someone who can {{impact_statement}}.\n\n"
            "Open to a 20-minute intro call next week?\n\n"
            "— {{sender_name}}"
        ),
    ),
    "interview-invite": Template(
        name="interview-invite",
        subject="Next step: {{round_name}} for {{role}}",
        body=(
            "Hi {{first_name}},\n\n"
            "Thanks for the great conversation! We'd love to move you to the "
            "{{round_name}} for our {{role}} role.\n\n"
            "Here are a few slots that work on our side:\n"
            "  • {{slot_one}}\n"
            "  • {{slot_two}}\n"
            "  • {{slot_three}}\n\n"
            "Reply with whichever fits and I'll get the calendar invite out.\n\n"
            "— {{sender_name}}"
        ),
    ),
    "offer": Template(
        name="offer",
        subject="Offer: {{role}} at {{company}}",
        body=(
            "Hi {{first_name}},\n\n"
            "It's official — we'd like to offer you the {{role}} role at {{company}}.\n\n"
            "Headline numbers:\n"
            "  • Base: {{base_salary}}\n"
            "  • Target bonus: {{bonus_pct}}\n"
            "  • Equity (4y): {{equity}}\n"
            "  • Sign-on: {{sign_on}}\n\n"
            "Full breakdown attached. Happy to walk through anything in detail.\n\n"
            "— {{sender_name}}"
        ),
    ),
    "polite-decline": Template(
        name="polite-decline",
        subject="Update on your {{role}} application at {{company}}",
        body=(
            "Hi {{first_name}},\n\n"
            "Thank you for the time you invested with our team — we genuinely "
            "appreciated meeting you.\n\n"
            "After comparing the full slate, we've decided to move forward with "
            "another candidate whose background lined up more closely with the "
            "specific scope of the {{role}} role.\n\n"
            "We'd love to keep in touch as we open future positions.\n\n"
            "— {{sender_name}}"
        ),
    ),
}


def render(template: Template, variables: Mapping[str, str]) -> tuple[str, str]:
    def _sub(match: "re.Match[str]") -> str:
        key = match.group(1)
        if key not in variables:
            raise KeyError(f"missing template variable: {key}")
        return str(variables[key])
    return _VAR_RE.sub(_sub, template.subject), _VAR_RE.sub(_sub, template.body)


def required_variables(template: Template) -> list[str]:
    return sorted(set(_VAR_RE.findall(template.subject + "\n" + template.body)))


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a recruiter email template.")
    parser.add_argument("template", choices=list(TEMPLATES))
    parser.add_argument("--vars", help="JSON object of merge variables.", default="{}")
    parser.add_argument("--required", action="store_true",
                        help="Print the variables the template needs and exit.")
    args = parser.parse_args()

    template = TEMPLATES[args.template]
    if args.required:
        print(json.dumps(required_variables(template), indent=2))
        return

    variables = json.loads(args.vars)
    subject, body = render(template, variables)
    print(json.dumps({"subject": subject, "body": body}, indent=2))


if __name__ == "__main__":
    main()
