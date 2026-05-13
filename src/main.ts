import type { CodeToHastOptions } from 'shiki/core'
import type { Compose } from './types'

function $<T extends HTMLElement>(id: string): T {
	return document.getElementById(id) as T
}

function debounce(fn: () => void, ms: number) {
	let t: ReturnType<typeof setTimeout>
	return () => {
		clearTimeout(t)
		t = setTimeout(fn, ms)
	}
}

// theme switcher (not wrapped so it runs first)

const $root = document.documentElement
const $themeBtn = $<HTMLButtonElement>('themeBtn')
$themeBtn.addEventListener('click', toggleTheme)

const savedTheme = localStorage.getItem('theme')
const darkQuery = matchMedia('(prefers-color-scheme: dark)')
const themeListener = (e: MediaQueryListEvent) => applyTheme(e.matches)

applyTheme(savedTheme ? savedTheme === 'dark' : darkQuery.matches)
if (!savedTheme)
	darkQuery.addEventListener('change', themeListener)

function applyTheme(isDark: boolean) {
	$root.classList.toggle('dark', isDark)
	$themeBtn.innerHTML = isDark ? '🌙' : '☀️'
}

function toggleTheme() {
	const isDark = !$root.classList.contains('dark')
	applyTheme(isDark)
	localStorage.setItem('theme', isDark ? 'dark' : 'light')
	darkQuery.removeEventListener('change', themeListener)
}

// html elements

const $loadDiv = $<HTMLDivElement>('loadDiv')

const $inputDiv = $<HTMLDivElement>('inputDiv')
const $inputTxt = $<HTMLTextAreaElement>('inputTxt')

const $outputDiv = $<HTMLDivElement>('outputDiv')
const $outputTxt = $<HTMLTextAreaElement>('outputTxt')

const $errorDiv = $<HTMLDivElement>('errorDiv')
const $errorSpan = $errorDiv.querySelector('span')!

const $copyBtn = $<HTMLButtonElement>('copyBtn')
const $loadBtn = $<HTMLButtonElement>('loadBtn')

// output helpers

function showError(message?: string) {
	if (!message) {
		$errorDiv.hidden = true
		return
	}
	$errorDiv.hidden = false
	$errorSpan.textContent = message
}

function setValue($txt: HTMLTextAreaElement, value: string) {
	$txt.value = value
	$txt.dispatchEvent(new CustomEvent('input'))
}

// parse logic

async function setupParse() {
	const { load } = await import('js-yaml')
	const { isCompose } = await import('./validator')
	const { CreateGenerator, DefaultLabelPrefix, CaddyfileGenerator_GenerateCaddyfile } = await import('./cdp/generator')

	const generator = CreateGenerator({
		LabelPrefix: DefaultLabelPrefix,
		CaddyfilePath: '',
	})

	function parse() {
		setValue($outputTxt, '')

		let parsed: unknown
		try {
			parsed = load($inputTxt.value)
		}
		catch (err) {
			showError((err as Error).message)
			return
		}

		if (!isCompose(parsed)) {
			showError('Invalid Compose file')
			return
		}

		const compose: Compose = {
			name: parsed.name,
			services: {},
		}
		for (const [serviceName, service] of Object.entries(parsed.services ?? {})) {
			compose.services![serviceName] = {
				container_name: service.container_name,
				labels: service.labels,
				deploy: service.deploy ?? {},
			}
		}

		setValue($outputTxt, CaddyfileGenerator_GenerateCaddyfile(generator, compose))
	}

	const debouncedParse = debounce(parse, 400)
	parse()
	$inputTxt.addEventListener('input', () => {
		showError()
		debouncedParse()
	})
}

// ui helpers

function switchIcon($btn: HTMLButtonElement, success: boolean) {
	const defIcon = $btn.textContent
	$btn.textContent = success ? '✅' : '❌'
	setTimeout(() => {
		$btn.textContent = defIcon
		$btn.disabled = false
	}, 1000)
}

function setupHelpers() {
	// eslint-disable-next-line ts/no-misused-promises
	$copyBtn.addEventListener('click', async () => {
		try {
			$copyBtn.disabled = true
			await navigator.clipboard.writeText($outputTxt.value)
			switchIcon($copyBtn, true)
		}
		catch {
			switchIcon($copyBtn, false)
		}
	})

	const loadInput = document.createElement('input')
	loadInput.type = 'file'
	loadInput.accept = '.yaml,.yml'
	$loadBtn.addEventListener('click', () => {
		$loadBtn.disabled = true
		loadInput.click()
	})
	// eslint-disable-next-line ts/no-misused-promises
	loadInput.addEventListener('change', async () => {
		const file = loadInput.files![0]
		if (!file || !/\.ya?ml$/i.test(file.name)) {
			loadError()
			return
		}
		setValue($inputTxt, await file.text())
		switchIcon($loadBtn, true)
	})
	function loadError() {
		switchIcon($loadBtn, false)
	}
	loadInput.addEventListener('cancel', loadError)

	const INDENT = '  '
	const ins = (text: string) => document.execCommand('insertText', false, text)
	const lineStart = (value: string, p: number) => value.lastIndexOf('\n', p - 1) + 1

	$inputTxt.addEventListener('keydown', (e) => {
		if (e.ctrlKey || e.altKey || e.metaKey)
			return
		const { selectionStart, selectionEnd, value } = $inputTxt

		if (e.key === 'Enter') {
			e.preventDefault()
			const line = value.slice(lineStart(value, selectionStart), selectionStart)
			ins(`\n${line.match(/^ */)![0]}`)
			return
		}
		if (e.key === 'Backspace') {
			if (selectionStart === selectionEnd) {
				const pre = value.slice(lineStart(value, selectionStart), selectionStart)
				if (/^ +$/.test(pre)) {
					e.preventDefault()
					const deleteCount = pre.length % INDENT.length || INDENT.length
					$inputTxt.setSelectionRange(selectionStart - deleteCount, selectionStart)
					document.execCommand('delete')
				}
			}
			return
		}
		if (e.key === 'Tab') {
			e.preventDefault()
			if (selectionStart === selectionEnd && !e.shiftKey) {
				ins(INDENT)
				return
			}
			const blockStart = lineStart(value, selectionStart)
			const searchFrom = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n' ? selectionEnd - 1 : selectionEnd
			const nextNewline = value.indexOf('\n', searchFrom)
			const blockEnd = nextNewline < 0 ? value.length : nextNewline
			const lines = value.slice(blockStart, blockEnd).split('\n')
			const out = lines.map(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : `${INDENT}${l}`)
			const outText = out.join('\n')
			$inputTxt.setSelectionRange(blockStart, blockEnd)
			ins(outText)
			if (e.shiftKey) {
				const firstRemoved = lines[0]!.length - out[0]!.length
				const totalRemoved = (blockEnd - blockStart) - outText.length
				const newStart = Math.max(blockStart, selectionStart - firstRemoved)
				$inputTxt.setSelectionRange(newStart, Math.max(newStart, selectionEnd - totalRemoved))
			}
			else {
				$inputTxt.setSelectionRange(selectionStart + INDENT.length, selectionEnd + lines.length * INDENT.length)
			}
		}
	})
}

// editor highlight

async function setupHighlight() {
	const { createHighlighter } = await import('./shiki')

	const highlighter = await createHighlighter()
	const shikiOpts: CodeToHastOptions = {
		lang: '',
		themes: {
			light: 'github-light-default',
			dark: 'github-dark-default',
		},
	}

	function highlight() {
		let text = $inputTxt.value
		if (text[text.length - 1] === '\n')
			text += ' ' // hack for shiki to show last line
		$inputDiv.innerHTML = highlighter.codeToHtml(text, {
			...shikiOpts,
			lang: 'yaml',
		})
		$outputDiv.innerHTML = highlighter.codeToHtml($outputTxt.value, {
			...shikiOpts,
			lang: 'Caddyfile',
		})
	}

	highlight()
	$inputTxt.addEventListener('input', highlight)
	$outputTxt.addEventListener('input', highlight)

	function syncScroll(txt: HTMLTextAreaElement, div: HTMLDivElement) {
		const $shiki = div.querySelector('.shiki') as HTMLPreElement
		$shiki.scrollTop = txt.scrollTop
		$shiki.scrollLeft = txt.scrollLeft
	}

	syncScroll($inputTxt, $inputDiv)
	syncScroll($outputTxt, $outputDiv)
	$inputTxt.addEventListener('scroll', () => syncScroll($inputTxt, $inputDiv))
	$outputTxt.addEventListener('scroll', () => syncScroll($outputTxt, $outputDiv))
}

// main function

const sampleCompose = `
services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:ci-alpine
    labels:
      caddy.email: admin@example.com
  whoami:
    image: traefik/whoami
    labels:
      caddy: example.com
      caddy.@ws.0_header: Connection *Upgrade*
      caddy.@ws.1_header: Upgrade websocket
      caddy.0_reverse_proxy: '@ws {{upstreams}}'
      caddy.1_reverse_proxy: /api* {{upstreams}}
`

async function main() {
	$loadDiv.hidden = false
	$inputTxt.disabled = true
	$outputTxt.disabled = true

	if (!$inputTxt.value)
		$inputTxt.value = sampleCompose.trim()

	setupHelpers()

	try {
		await setupParse()
		$inputTxt.disabled = false
		$outputTxt.disabled = false
	}
	catch (err) {
		showError((err as Error).message)
	}
	finally {
		$loadDiv.hidden = true
	}

	try {
		await setupHighlight()
		$inputTxt.style.color = 'transparent'
		$inputTxt.style.background = 'transparent'
		$outputTxt.style.color = 'transparent'
		$outputTxt.style.background = 'transparent'
	}
	catch (err) {
		console.error('Failed to set up syntax highlighting:', err)
	}
}

void main()
