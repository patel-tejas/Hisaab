/** Browser-only helper: save a string as a file the user downloads. */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  // The BOM makes Excel read the file as UTF-8, so Hindi notes and symbols survive.
  const blob = new Blob(["﻿", content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
