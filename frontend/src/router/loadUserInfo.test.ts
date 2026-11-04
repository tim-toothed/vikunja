import {describe, it, expect, vi, beforeEach} from 'vitest'

const {authStore, baseStore} = vi.hoisted(() => ({
	authStore: {
		info: null as Record<string, unknown> | null,
		refreshUserInfo: vi.fn(async () => {}),
	},
	baseStore: {appReady: Promise.resolve()},
}))

vi.mock('@/stores/auth', () => ({useAuthStore: () => authStore}))
vi.mock('@/stores/base', () => ({useBaseStore: () => baseStore}))

import {loadUserInfo} from './loadUserInfo'

const fullInfo = {id: 1, username: 'user1', is_admin: false, is_local_user: true}

describe('loadUserInfo', () => {
	beforeEach(() => {
		authStore.info = {id: 1, username: 'user1'}
		authStore.refreshUserInfo.mockReset()
		baseStore.appReady = Promise.resolve()
	})

	it('fetches /user when only the JWT fallback is loaded', async () => {
		authStore.refreshUserInfo.mockImplementation(async () => {
			authStore.info = fullInfo
		})

		expect(await loadUserInfo()).toEqual(fullInfo)
		expect(authStore.refreshUserInfo).toHaveBeenCalledOnce()
	})

	it('returns a loaded user without refetching', async () => {
		authStore.info = fullInfo

		expect(await loadUserInfo()).toEqual(fullInfo)
		expect(authStore.refreshUserInfo).not.toHaveBeenCalled()
	})

	it('reads the user only once the app is ready', async () => {
		baseStore.appReady = new Promise(resolve => setTimeout(() => {
			authStore.info = fullInfo
			resolve()
		}, 0))

		expect(await loadUserInfo()).toEqual(fullInfo)
		expect(authStore.refreshUserInfo).not.toHaveBeenCalled()
	})

	it('returns null without a session', async () => {
		authStore.info = null

		expect(await loadUserInfo()).toBeNull()
		expect(authStore.refreshUserInfo).toHaveBeenCalledOnce()
	})
})
