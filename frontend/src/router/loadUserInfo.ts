import {useAuthStore} from '@/stores/auth'
import {useBaseStore} from '@/stores/base'

// For route guards that read fields only GET /user has: until it answers, info is
// the JWT fallback, which lacks is_admin and is_local_user.
export async function loadUserInfo() {
	// appReady doesn't wait on router.isReady(), so this can't deadlock the initial navigation.
	await useBaseStore().appReady
	const authStore = useAuthStore()
	// checkAuth() is debounced and may not have fetched it.
	if (authStore.info?.is_local_user === undefined) {
		await authStore.refreshUserInfo()
	}
	return authStore.info
}
