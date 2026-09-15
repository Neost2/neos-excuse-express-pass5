# Neo's ExcuseExpress — Parent Pass

Parent-first Expo app with in-app excuse submission. Parents select a child, photograph or choose an existing note, review the destination/details, and submit without leaving the app.

## Privacy-oriented architecture
- Camera photos can be saved to the parent's device photo library.
- The Expo app does not maintain a cloud photo library.
- The included Send API accepts one image into process memory, routes only to a server-side verified school ID, submits the email, and does not write the image to its own disk/database.
- Production infrastructure, email-provider retention/logging, backups, monitoring and privacy terms must be reviewed before making claims about end-to-end deletion or regulatory compliance.

## App
```bash
npm install
cp .env.example .env
npx expo install --fix
npx expo start --tunnel
```
Set `EXPO_PUBLIC_SEND_API_URL` to the computer/server address reachable by the device. `localhost` is suitable for web on the same machine, not a physical phone.

## Send API
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
`MAIL_MODE=mock` is the safe default and sends no real email. `GET /health` checks the service.

## Amazon SES production mode
Set `MAIL_MODE=ses`, `AWS_REGION`, and `SES_FROM_EMAIL`. Verify the sending identity/domain in Amazon SES and supply AWS credentials through the deployment environment/IAM role. Never put AWS secrets in the Expo app.

The demo school emails in `data/schools.ts` and `server/src/index.ts` must be replaced only with school-verified destinations before real sending.

## License
Copyright © 2026 Neost Apps LLC. All Rights Reserved. See `LICENSE`.
