# Firebase setup

The frontend now uses Firebase Authentication, Firestore, and Storage. The service-account private key is not used by the browser.

1. Authenticate the Firebase CLI:

```powershell
npx firebase-tools login
```

2. Deploy rules and indexes:

```powershell
npm run firebase:deploy
```

3. In Firebase Console, enable Authentication providers:

- Email/Password
- Google
- Phone

4. Add the local and deployed web origins under Authentication > Settings > Authorized domains.

The rules create these access expectations:

- Signed-in users can read dashboard collections.
- Users can read and update their own `users/{uid}` profile.
- Users can create their own challenges, comments, applications, support offers, and workflow records.
- Administrators can manage operational collections.
- Storage files are scoped to `/{scope}/{uid}/...`.

Do not place a Firebase Admin service-account JSON or private key in this frontend repository. Use it only in a trusted server or Cloud Functions environment, and rotate any key that has been exposed.
