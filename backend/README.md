# Backend administration

## Promote the initial admin

1. Create the account through the app.
2. Set `ADMIN_EMAIL` in `backend/.env` to that account's email.
3. From the `backend` directory, run `npm run admin:promote`.
4. Restart the backend and sign in again.

Promotion is an explicit command; matching `ADMIN_EMAIL` during public signup
does not grant admin access. Keep the environment file private.

Admins can open **Admin** in the app navigation to list users and delete
non-admin accounts. Deleting an account also deletes its messages. Admin
accounts cannot be deleted from this page.
