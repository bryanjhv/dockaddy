import type { LanguageRegistration } from 'shiki/core'
import yamlLang from '@shikijs/langs/yaml'
import githubDarkDefault from '@shikijs/themes/github-dark-default'
import githubLightDefault from '@shikijs/themes/github-light-default'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const CADDY_SYNTAX_URL = 'https://raw.githubusercontent.com/caddyserver/vscode-caddyfile/refs/heads/master/syntaxes/caddyfile.tmLanguage.json'

export async function createHighlighter() {
	const res = await fetch(CADDY_SYNTAX_URL)
	if (!res.ok)
		throw new Error(`Failed to fetch Caddyfile syntax`)
	const caddyfileLang = await res.json() as LanguageRegistration

	return createHighlighterCoreSync({
		engine: createJavaScriptRegexEngine(),
		langs: [
			yamlLang,
			caddyfileLang,
		],
		themes: [
			githubDarkDefault,
			githubLightDefault,
		],
	})
}
