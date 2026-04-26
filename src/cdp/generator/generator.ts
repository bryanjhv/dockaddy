import type { Compose } from '../../types'
import type { Options } from '../config'
import { Block_IsGlobalBlock, Container_AddBlock, Container_Marshal, Container_Merge, Container_Remove, CreateContainer, Unmarshal } from '../caddyfile'
import { _CaddyfileGenerator_getContainerCaddyfile } from './containers'

export const DefaultLabelPrefix = 'caddy'

export interface CaddyfileGenerator {
	options: Options
	labelRegex: RegExp
}

export function CreateGenerator(options: Options): CaddyfileGenerator {
	const quoted = options.LabelPrefix.replaceAll(/[\\.+*?()|[\]{}^$]/g, '\\$&')
	const labelRegexString = `^${quoted}(?:_\\d+)?(?:\\.|$)`

	return {
		options,
		labelRegex: new RegExp(labelRegexString),
	}
}

export function CaddyfileGenerator_GenerateCaddyfile(g: CaddyfileGenerator, compose: Compose): string {
	const caddyfileBuffer: string[] = []

	const caddyfileBlock = CreateContainer()

	if (g.options.CaddyfilePath)
		Container_Merge(caddyfileBlock, Unmarshal(g.options.CaddyfilePath))

	for (const [name, service] of Object.entries(compose.services ?? {})) {
		const containerCaddyfile = _CaddyfileGenerator_getContainerCaddyfile(g, { composeName: compose.name, name, ...service })
		Container_Merge(caddyfileBlock, containerCaddyfile)
	}

	const globalCaddyfile = CreateContainer()
	for (const block of caddyfileBlock.Children) {
		if (Block_IsGlobalBlock(block)) {
			Container_AddBlock(globalCaddyfile, block)
			Container_Remove(caddyfileBlock, block)
		}
	}
	caddyfileBuffer.push(Container_Marshal(globalCaddyfile))

	caddyfileBuffer.push(Container_Marshal(caddyfileBlock))

	let caddyfileContent = caddyfileBuffer.join('')

	if (caddyfileContent.length === 0)
		caddyfileContent = '# Empty caddyfile'

	return caddyfileContent
}

function CaddyfileGenerator_filterLabels(g: CaddyfileGenerator, labels: Record<string, string>): Record<string, string> {
	const filteredLabels: Record<string, string> = {}
	for (let [label, value] of Object.entries(labels)) {
		if (g.labelRegex.test(label)) {
			label = label.replace(g.options.LabelPrefix, DefaultLabelPrefix)
			filteredLabels[label] = value
		}
	}
	return filteredLabels
}

export { CaddyfileGenerator_filterLabels as _CaddyfileGenerator_filterLabels }
