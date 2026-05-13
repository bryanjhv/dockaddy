export type ListOrDict = string[] | Record<string, string | number | boolean | null>

export type Deployment = {
	replicas?: number | string
	labels?: ListOrDict
} | null

export type Build = string | { labels?: ListOrDict }

export interface Service {
	container_name?: string
	deploy?: Deployment
	build?: Build
	labels?: ListOrDict
	scale?: number | string
}

export interface Compose {
	name?: string
	services?: Record<string, Service>
}
