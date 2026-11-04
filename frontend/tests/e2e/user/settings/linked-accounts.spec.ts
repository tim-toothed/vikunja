import type {APIRequestContext} from '@playwright/test'
import {test, expect} from '../../../support/fixtures'
import {gotoUserSettings} from '../../../support/userSettings'
import {linkDexAccount} from '../../../support/linkedAccounts'
import {UserIdentityFactory} from '../../../factories/user_identity'
import {TEST_PASSWORD} from '../../../support/constants'

async function listIdentities(apiContext: APIRequestContext, token: string) {
	const response = await apiContext.get('/api/v2/user/settings/identities', {
		headers: {Authorization: `Bearer ${token}`},
	})
	expect(response.ok()).toBe(true)
	return (await response.json()).items ?? []
}

test.describe('Linked accounts', () => {
	test('links a Dex account after confirming the password', async ({
		authenticatedPage: page,
		apiContext,
		userToken,
	}) => {
		await gotoUserSettings(page, 'linked-accounts')
		await expect(page.getByText('You have not linked any accounts yet.')).toBeVisible()

		await linkDexAccount(page)
		await page.locator('#linkIdentityPassword').fill(TEST_PASSWORD)
		await page.getByRole('button', {name: 'Link account'}).click()

		await expect(page).toHaveURL(/\/user\/settings\/linked-accounts/)
		await page.reload()
		await expect(page.locator('.card table')).toContainText('Dex')
		await expect(page.getByRole('button', {name: 'Link Dex', exact: true})).toHaveCount(0)

		const identities = await listIdentities(apiContext, userToken)
		expect(identities).toHaveLength(1)
		expect(identities[0].provider_key).toBe('dex')
	})

	test('keeps the confirmation form after a wrong password', async ({
		authenticatedPage: page,
		apiContext,
		userToken,
	}) => {
		await gotoUserSettings(page, 'linked-accounts')
		await linkDexAccount(page)

		await page.locator('#linkIdentityPassword').fill('wrong password')
		await page.getByRole('button', {name: 'Link account'}).click()
		await expect(page.getByText('Wrong username or password.')).toBeVisible()
		expect(await listIdentities(apiContext, userToken)).toHaveLength(0)

		// The code was not exchanged yet, so the same callback can still link.
		await page.locator('#linkIdentityPassword').fill(TEST_PASSWORD)
		await page.getByRole('button', {name: 'Link account'}).click()
		await expect(page).toHaveURL(/\/user\/settings\/linked-accounts/)
		expect(await listIdentities(apiContext, userToken)).toHaveLength(1)
	})

	test('unlinks an identity of a removed provider', async ({
		authenticatedPage: page,
		apiContext,
		currentUser,
		userToken,
	}) => {
		await UserIdentityFactory.create(1, {user_id: currentUser.id})
		await gotoUserSettings(page, 'linked-accounts')

		const row = page.locator('.card table tbody tr')
		await expect(row).toContainText('https://gone.example.com')
		await row.getByRole('button', {name: 'Unlink'}).click()

		const dialog = page.getByRole('dialog', {name: 'Unlink https://gone.example.com'})
		await dialog.locator('#unlinkIdentityPassword').fill('wrong password')
		await dialog.getByRole('button', {name: 'Unlink'}).click()
		await expect(page.locator('.global-notification')).toContainText('Wrong username or password.')
		await expect(dialog).toBeVisible()
		expect(await listIdentities(apiContext, userToken)).toHaveLength(1)

		await dialog.locator('#unlinkIdentityPassword').fill(TEST_PASSWORD)
		await dialog.getByRole('button', {name: 'Unlink'}).click()

		await expect(page.getByText('You have not linked any accounts yet.')).toBeVisible()
		await page.reload()
		await expect(page.getByText('You have not linked any accounts yet.')).toBeVisible()
		expect(await listIdentities(apiContext, userToken)).toHaveLength(0)
	})
})
