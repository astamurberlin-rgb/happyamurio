// Rich-text editing omits HTML comments; keep the document's archive membership.
export function preserveArchive(base, edited) {
  return /^<!-- notes:archive -->/m.test(base) && !/^<!-- notes:archive -->/m.test(edited)
    ? '<!-- notes:archive -->\n\n' + edited : edited;
}
