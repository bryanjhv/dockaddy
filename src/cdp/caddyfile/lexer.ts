interface lexer {
	_buf: string
	_pos: number
	token: Token
	line: number
	skippedLines: number
}

export interface Token {
	File: string
	Line: number
	Text: string
}

function new_lexer(): lexer {
	return {
		_buf: '',
		_pos: 0,
		token: { File: '', Line: 0, Text: '' },
		line: 0,
		skippedLines: 0,
	}
}

function _ReadRune(l: lexer): string | null {
	if (l._pos >= l._buf.length)
		return null
	const cp = l._buf.codePointAt(l._pos)!
	const ch = String.fromCodePoint(cp)
	l._pos += ch.length
	return ch ?? null
}

function lexer_load(l: lexer, input: string): void {
	l._buf = input
	l._pos = 0
	l.line = 1

	const firstCh = _ReadRune(l)
	if (firstCh === null)
		throw new Error('input is empty')
	if (firstCh !== '\uFEFF')
		l._pos -= firstCh.length
}

function lexer_next(l: lexer): boolean {
	const val: string[] = []
	let comment = false
	let quoted = false
	let btQuoted = false
	let escaped = false

	const makeToken = () => {
		l.token.Text = val.join('')
		return true
	}

	while (true) {
		const ch = _ReadRune(l)
		if (ch === null) {
			if (val.length > 0)
				return makeToken()
			return false
		}

		if (!escaped && !btQuoted && ch === '\\') {
			escaped = true
			continue
		}

		if (quoted || btQuoted) {
			if (quoted && escaped) {
				if (ch !== '"')
					val.push('\\')
				escaped = false
			}
			else {
				if (quoted && ch === '"')
					return makeToken()
				if (btQuoted && ch === '`') {
					return makeToken()
				}
			}
			if (ch === '\n') {
				l.line += 1 + l.skippedLines
				l.skippedLines = 0
			}
			val.push(ch)
			continue
		}

		if (/\p{White_Space}/u.test(ch)) {
			if (ch === '\r')
				continue
			if (ch === '\n') {
				if (escaped) {
					l.skippedLines++
					escaped = false
				}
				else {
					l.line += 1 + l.skippedLines
					l.skippedLines = 0
				}
				comment = false
			}
			if (val.length > 0)
				return makeToken()
			continue
		}

		if (ch === '#' && val.length === 0)
			comment = true
		if (comment)
			continue

		if (val.length === 0) {
			l.token = { File: '', Line: l.line, Text: '' }
			if (ch === '"') {
				quoted = true
				continue
			}
			if (ch === '`') {
				btQuoted = true
				continue
			}
		}

		if (escaped) {
			val.push('\\')
			escaped = false
		}

		val.push(ch)
	}
}

export { lexer_load as _lexer_load, lexer_next as _lexer_next, new_lexer as _new_lexer }
