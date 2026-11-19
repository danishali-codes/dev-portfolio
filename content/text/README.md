# Site text

Everything the site says lives in these files. Edit one on GitHub (the pencil icon), commit, and Vercel puts it live in about a minute.

| File | What's in it |
| --- | --- |
| `terminal.yaml` | The terminal: welcome lines, `help`, every command's description and replies |
| `eggs.yaml` | Easter eggs: fortunes, neofetch, sudo, vim, hack, coffee, snake and the rest |
| `achievements.yaml` | The 20 achievements, the notepad and the shareable badge |
| `gags.yaml` | Start-up screen, screensaver, blue screen, hack, shutdown, fake WordPress login, browser console |
| `desktop.yaml` | Taskbar, start menu, desktop icons, right-click menu, window buttons and titles, Ctrl+K search, calendar, the Now note |
| `windows.yaml` | Welcome, 404, folders and trash, project pages, image viewer, Stats, Guestbook, Ask, CV & contact, System Updates, wallpaper picker, leaderboards |
| `phone.yaml` | The phone home screen and dock |

The About page, Now note, CV, résumé, Uses, contact card and project write-ups are still where they were, one folder up in `content/`.

## How a line looks

```yaml
nano: 'nano: good taste, but everything here is read-only.'
```

The part before the colon is the name the code looks for. Don't rename it. Change the text after it.

**Quotes.** You can usually leave them off. Put the text in single quotes `'like this'` if it starts with `*`, `` ` ``, `[`, `{`, `'`, `"` or `-`, or if it contains `: ` or ` #`. Inside single quotes, write an apostrophe twice: `'it''s fine'`. Or use double quotes when the text has an apostrophe: `"it's fine"`.

**Lists.** A list is lines that start with `- `. Add or remove as many as you like (the fortunes, the hack steps, the vim exit replies…).

```yaml
fortunes:
  - It works on my machine. Ship the machine.
  - Another one.
```

**Long text.** Use `|-` and indent the lines under it. Line breaks are kept.

**Comments.** Anything after `#` at the start of a line is a note to yourself and never shows up.

## Placeholders

Words in curly brackets, like `{count}` or `{name}`, are filled in by the site: a number, a file name, a link. You can move them around in the sentence or drop them, but you can't make up new ones. The site wouldn't know what to put there, and the build stops with an error naming the line.

To pick a word by number, write the placeholder, then the singular, then the plural:

```yaml
won: 'Got it in {tries} {tries|try|tries}!'
```

## Styling

In the terminal files (`terminal.yaml`, `eggs.yaml`):

| Write | Shows as |
| --- | --- |
| `**bold**` | bold |
| `*accent*` | the terminal's highlight colour |
| `_dim_` | dimmed grey |
| `` `help` `` | a command people can click to run |
| `[label](https://…)` | a link |

In the other files only `**bold**`, `*italic*` and `[label](https://…)` work, and only on lines that already use them (like the notepad score). Elsewhere the characters show up as typed.

To show a literal `*`, `_` or backtick where it would be read as styling, put a backslash before it: `\*`.

ASCII art (the tea cup, the vim screen) is shown in a fixed-width font, so spaces count.

## If something goes wrong

The build checks every file. If a file can't be read, a name the code needs is missing, or a line uses a placeholder the code doesn't fill in, the deploy fails with a message saying which line. The live site keeps the previous version until it's fixed, so nobody sees a broken page. You'll see a red ✗ next to the commit on GitHub.
