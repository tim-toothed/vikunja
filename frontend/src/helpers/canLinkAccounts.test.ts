import {describe, it, expect} from 'vitest'
import type {IProvider} from '@/types/IProvider'
import {canLinkAccounts} from './canLinkAccounts'

const provider = {key: 'dex', name: 'Dex'} as IProvider
const local = {is_local_user: true}

describe('canLinkAccounts', () => {
	it('allows a local user when OpenID has a provider', () => {
		expect(canLinkAccounts({enabled: true, providers: [provider]}, local)).toBe(true)
	})

	it('needs OpenID enabled', () => {
		expect(canLinkAccounts({enabled: false, providers: [provider]}, local)).toBe(false)
	})

	it('needs a provider', () => {
		expect(canLinkAccounts({enabled: true, providers: []}, local)).toBe(false)
	})

	it('needs a local user', () => {
		const openid = {enabled: true, providers: [provider]}
		expect(canLinkAccounts(openid, {is_local_user: false})).toBe(false)
		expect(canLinkAccounts(openid, {})).toBe(false)
		expect(canLinkAccounts(openid, null)).toBe(false)
	})
})
