# Beta plan: two weeks, 10 to 20 testers

The question this beta answers: **does Flow earn its place on someone's
computer?** Not "do people like how it looks". The look is frozen at v0.1.29
for the length of the beta; only fixes ship.

## What we measure

Every number comes from the "Beta numbers" block testers paste into their
weekly check-in (Settings > Report a problem > Show technical details).

| Question | Number | Good sign (starting guess) |
| --- | --- | --- |
| Do they keep using it? | Days used in the last 14 | 5+ days in week two |
| Are Flow's suggestions right? | saved / (saved + not useful + not now) | 30% or more saved |
| Does a saved workflow work? | finished / (finished + stopped at a step) | 80% or more finish |
| Do suggestions show up at all? | Suggestions made, last 7 days | at least 2 a week |

Plus one question in each check-in: *would you keep Noma running if the
beta ended today?* That answer matters more than any of the numbers.

Read them together. Lots of suggestions but few saved means Flow notices
the wrong things. Few suggestions at all means the thresholds are too
strict for real work. The "not useful because" line says which: "wrong
steps" is detection getting the workflow wrong, "don't repeat it" is the
threshold firing too early, "wouldn't save time" is a real workflow that
isn't worth a zone. Saved workflows that stop at a step are replay bugs:
ask that tester for a "Something broke" report.

## Schedule

- **Day 0:** send the invite below. Install calls if anyone gets stuck,
  especially on a Mac (Accessibility permission).
- **Day 3:** short message: "anything broken or confusing so far?"
- **Day 7:** first weekly check-in.
- **Day 14:** second check-in, then a 15-minute call with whoever will do one.
- **Releases:** at most one a week, fixes only. Every update on an unsigned
  Mac build makes testers allow Accessibility again.

Keep a simple sheet: tester, OS + laptop, install date, then per week the
four numbers above and the "keep it running?" answer.

## Invite (edit freely)

> Hey! I'm building Noma, a small app that notices the shortcut sequences
> you repeat across apps and offers to turn them into one action. I'm
> looking for 10 to 20 people to use it for two weeks while they work
> normally.
>
> What it takes: install it (5 minutes), use your computer as usual, and
> once a week paste a short summary into a form (2 minutes). The summary is
> counts only. Noma never sees what you type and never sends anything on
> its own.
>
> Works on Windows 10/11 and on Macs. Download: nomashift.com
> Setup guide: [link to beta-testing-guide]
>
> Want in?
