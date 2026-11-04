import {setupApiUrl} from '../../support/authenticateUser'
import {TEST_PASSWORD} from '../../support/constants'
import {gotoUserSettings} from '../../support/userSettings'
import {test, expect} from '../../support/fixtures'

test.describe('OpenID Login', () => {
	test('logs in via Dex provider', async ({page}) => {
		await setupApiUrl(page)
		await page.goto('/login')
		await page.locator('text=Dex').click()

		// Wait for navigation to Dex origin
		await expect(page.locator('h2')).toContainText('Log in to Your Account')

		// Fill in the Dex login form
		await page.locator('#login').fill('test@example.com')
		await page.locator('#password').fill('12345678')
		await page.locator('#submit-login').click()

		// Should redirect back to the app
		await expect(page).toHaveURL(/\//)
		await expect(page.locator('main.app-content .content h1')).toContainText('test')
		await expect(page.locator('.show-tasks h2')).toContainText('Current Tasks')
	})

	test('logs a local user with a linked Dex identity into their own account', async ({page, apiContext, currentUser}) => {
		// Not authenticatedPage: its init script would restore the old token after logout.
		await setupApiUrl(page)
		await page.goto('/login')
		await page.locator('input[id=username]').fill(currentUser.username)
		await page.locator('input[id=password]').fill(TEST_PASSWORD)
		await page.locator('.button').filter({hasText: 'Login'}).click()
		await expect(page).toHaveURL('/')

		await gotoUserSettings(page, 'linked-accounts')
		await page.getByRole('button', {name: 'Link Dex', exact: true}).click()
		await expect(page.locator('h2')).toContainText('Log in to Your Account')
		await page.locator('#login').fill('test@example.com')
		await page.locator('#password').fill('12345678')
		await page.locator('#submit-login').click()
		await page.locator('#linkIdentityPassword').fill(TEST_PASSWORD)
		await page.getByRole('button', {name: 'Link account'}).click()
		await expect(page.locator('.card table')).toContainText('Dex')

		await page.locator('.navbar .username-dropdown-trigger').click()
		await page.locator('.navbar .dropdown-item').filter({hasText: 'Logout'}).click()
		await expect(page).toHaveURL(/\/login/)

		await page.getByRole('button', {name: 'Log in with Dex'}).click()
		await expect(page.locator('h2')).toContainText('Log in to Your Account')
		await page.locator('#login').fill('test@example.com')
		await page.locator('#password').fill('12345678')
		await page.locator('#submit-login').click()

		await expect(page.locator('main h1')).toContainText(currentUser.username)
		const token = await page.evaluate(() => localStorage.getItem('token'))
		const response = await apiContext.get('user', {
			headers: {Authorization: `Bearer ${token}`},
		})
		expect(response.ok()).toBe(true)
		expect((await response.json()).id).toBe(currentUser.id)
	})
})
