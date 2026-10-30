# Internal change history

This folder is an internal working log for maintainers. It is not part of the
Batchlogg website and is not connected to the public changelog, admin content
tools, or `data/changelog.json`.

## Entries

- Create one Markdown file per date, named `YYYY-MM-DD.md`.
- Filenames sort chronologically; read the latest dated entry first when
  updating this history.
- If multiple snapshots are needed on the same date, append a sequence number,
  for example `YYYY-MM-DD-02.md`.
- Group notes by user-visible feature or behavior, not just by changed file.
  Mention required database migrations when relevant.

## Updating the log

When asked to record changes, inspect the current Git worktree and compare each
uncommitted feature with the latest entry in this folder. Record only changes
that are not already covered by the prior entry, including related files and
migrations. Do not treat every changed file as a new feature, and do not
duplicate already logged work. Keep these notes internal; never publish them
through the site changelog unless explicitly asked.

## Pushing to Git or Tauri

Whenever a task includes pushing changes to Git and/or publishing a Tauri
build, record the push in the dated internal log, even if the task does not
otherwise ask for a changelog entry. Note the date and time, which destination
was updated (Git, Tauri, or both), and the identifying commit, tag, or release
version when available.

Record the Git commit that was pushed as the baseline for the next update. On
future push or changelog tasks, compare the current worktree and commits with
that recorded baseline to identify changes made since the last push. If Git
and Tauri were updated at different times or to different revisions, record a
separate baseline for each destination. Do not claim a push succeeded unless
the command or release operation confirmed it.
