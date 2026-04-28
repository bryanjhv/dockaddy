import {
	isAny,
	isArray,
	isBoolean,
	isNull,
	isNumber,
	isOptional,
	isPlainObject,
	isString,
} from '@sindresorhus/is'

type ListOrDict = string[] | Record<string, string | number | boolean | null>

type Deployment = {
	replicas?: number | string
	labels?: ListOrDict
} | null

type Build = string | { labels?: ListOrDict }

interface Service {
	deploy?: Deployment
	build?: Build
	container_name?: string
	labels?: ListOrDict
	scale?: number | string
}

interface Compose {
	name?: string
	services?: Record<string, Service>
}

function isListOrDict(value: unknown): value is ListOrDict {
	return isString(value) || (
		isPlainObject(value)
		&& isArray(Object.values(value), isAny([isString, isNumber, isBoolean, isNull]))
	)
}

function isDeployment(value: unknown): value is Deployment {
	return isNull(value) || (
		isPlainObject(value)
		&& isOptional(value['replicas'], isAny([isNumber, isString]))
		&& isOptional(value['labels'], isListOrDict)
	)
}

function isBuild(value: unknown): value is Build {
	return isString(value) || (
		isPlainObject(value)
		&& isOptional(value['labels'], isListOrDict)
	)
}

function isContainerName(value: unknown): value is string {
	return isString(value) && /^[a-z0-9][\w.-]+$/i.test(value)
}

function isService(value: unknown): value is Service {
	return (
		isPlainObject(value)
		&& isOptional(value['deploy'], isDeployment)
		&& isOptional(value['build'], isBuild)
		&& isOptional(value['container_name'], isContainerName)
		&& isOptional(value['labels'], isListOrDict)
		&& isOptional(value['scale'], isAny([isNumber, isString]))
	)
}

function isServicesMap(value: unknown): value is Record<string, Service> {
	return (
		isPlainObject(value)
		&& isArray(Object.keys(value), isContainerName)
		&& isArray(Object.values(value), isService)
	)
}

export function isCompose(value: unknown): value is Compose {
	return (
		isPlainObject(value)
		&& isOptional(value['name'], isString)
		&& isOptional(value['services'], isServicesMap)
	)
}
