# Getting Started

There are three ways to run Walker, depending on your situation.

## 1. A hosted instance

If your organization already runs a shared Walker instance, this is the easiest option: someone gives
you a URL, you sign in, and you're done — no installation. Ask whoever set it up for the address.
(Hosted, multi-user instances with sign-in are a newer capability; if you don't have one available,
use one of the self-hosted options below instead.)

## 2. Self-hosted with Docker

If you have Docker available — on your own machine, a home server, or a small VPS — you can run
Walker as a container with a single command. This is the recommended option if you're comfortable
with Docker and want your data to persist across restarts and upgrades.

See [Self-hosting: Docker](self-hosting/docker.md) for the exact commands.

## 3. Standalone `.exe` (Windows)

If you're on Windows and don't want to install Docker, Python, or Node, download a single executable
from the project's Releases page, double-click it, and Walker opens in your browser. No dev
environment, no build step.

See [Self-hosting: Standalone .exe](self-hosting/standalone-exe.md) for details.

## Which one should I pick?

| Situation | Recommended option |
| --- | --- |
| Your company/team already has a shared Walker | Hosted instance |
| You want a persistent, always-on personal instance | Docker |
| You want to try Walker on Windows with zero setup | Standalone `.exe` |

Once Walker is running, head to the [Day-to-day Guide](guide.md) to learn how to track time and
prepare your timesheet.
