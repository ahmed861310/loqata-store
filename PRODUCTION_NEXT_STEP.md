# متجر لقطة — Production Handoff v5.13.0

## Completed in this step
- Preserved the Paymob test-connected project.
- Added a production handoff checklist.
- Added a safe environment-variable template.
- No real credentials or secrets were inserted.

## Before launch
1. Deploy the app/API on a public HTTPS domain.
2. Add real Paymob credentials in the hosting provider's secret manager.
3. Set the production webhook URL.
4. Configure the production return URL.
5. Run a real low-value payment and verify:
   - successful payment
   - failed payment
   - webhook signature validation
   - duplicate webhook handling
   - order status update
6. Disable test mode and remove debug logs.
7. Confirm admin access protection and backup policy.
