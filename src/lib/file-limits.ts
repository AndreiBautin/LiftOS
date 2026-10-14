/**
 * The largest file either import will read: a backup, or a Strong or
 * Hevy export. Years of training are a few megabytes; a file past this is
 * the wrong file or a hostile one, and reading it would freeze the tab
 * before anything could say so. Checked on `File.size`, before a byte is
 * read.
 */
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024

export const TOO_LARGE_MESSAGE =
  'That file is far larger than any training history — it is probably not the right file.'
