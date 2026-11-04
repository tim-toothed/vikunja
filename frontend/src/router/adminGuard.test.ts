import {describe, it, expect, vi, beforeEach} from 'vitest'

const {authStore, baseStore, configStore} = vi.hoisted(() => {
	const authStore = {
		authUser: true,
		authLinkShare: false,
		info: {id: 1, username: 'user1'} as Record<string, unknown> | null,
		checkAuth: vi.fn(async () => {}),
		refreshUserInfo: vi.fn(async () => {}),
		verifyEmail: vi.fn(),
	}
	const baseStore = {appReady: Promise.resolve()}
	const configStore = {isProFeatureEnabled: vi.fn(() => true)}
	return {authStore, baseStore, configStore}
})

vi.mock('@/message', () => ({success: vi.fn(), error: vi.fn()}))
vi.mock('@/i18n', () => ({i18n: {global: {t: (key: string) => key}}}))
vi.mock('@/stores/auth', () => ({useAuthStore: () => authStore}))
vi.mock('@/stores/base', () => ({useBaseStore: () => baseStore}))
vi.mock('@/stores/config', () => ({useConfigStore: () => configStore}))
vi.mock('@/views/admin/AdminShell.vue', () => ({default: {render: () => null}}))
vi.mock('@/views/admin/OverviewView.vue', () => ({default: {render: () => null}}))

import router from './index'

async function navigateToAdmin() {
	await router.push('/')
	await router.push('/admin')
	return router.currentRoute.value.name
}

describe('admin panel route guard', () => {
	beforeEach(() => {
		authStore.info = {id: 1, username: 'user1'}
		authStore.refreshUserInfo.mockReset()
		configStore.isProFeatureEnabled.mockReturnValue(true)
		baseStore.appReady = Promise.resolve()
	})

	it('fetches /user when only the JWT fallback is loaded', async () => {
		authStore.refreshUserInfo.mockImplementation(async () => {
			authStore.info = {id: 1, username: 'user1', is_admin: true, is_local_user: true}
		})

		expect(await navigateToAdmin()).toBe('admin.overview')
		expect(authStore.refreshUserInfo).toHaveBeenCalledOnce()
	})

	it('does not refetch a loaded user', async () => {
		authStore.info = {id: 1, username: 'user1', is_admin: true, is_local_user: true}

		expect(await navigateToAdmin()).toBe('admin.overview')
		expect(authStore.refreshUserInfo).not.toHaveBeenCalled()
	})

	it('waits for the app to be ready', async () => {
		let ready = false
		baseStore.appReady = new Promise(resolve => setTimeout(() => {
			ready = true
			authStore.info = {id: 1, username: 'user1', is_admin: true, is_local_user: true}
			resolve()
		}, 0))

		expect(await navigateToAdmin()).toBe('admin.overview')
		expect(ready).toBe(true)
		expect(authStore.refreshUserInfo).not.toHaveBeenCalled()
	})

	it('hides the panel from non-admins', async () => {
		authStore.info = {id: 1, username: 'user1', is_admin: false, is_local_user: true}

		expect(await navigateToAdmin()).toBe('not-found')
	})

	it('hides the panel when the feature is off', async () => {
		authStore.info = {id: 1, username: 'user1', is_admin: true, is_local_user: true}
		configStore.isProFeatureEnabled.mockReturnValue(false)

		expect(await navigateToAdmin()).toBe('not-found')
	})
})
