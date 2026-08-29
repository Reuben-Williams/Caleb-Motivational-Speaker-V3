# Historical HighLevel speaking-inquiry workflow setup

> **Inactive reference — do not execute.** Caleb Jakes no longer uses HighLevel
> for website booking inquiries. This document is retained only to explain the
> previously approved source workflow. The active operating guide is
> [`native-speaking-inquiry-workflow.md`](./native-speaking-inquiry-workflow.md).
> Do not create, publish, edit, or reconnect this workflow.

Use this runbook only in the **Joyionaire Enterprises LLC** sub-account with
location ID `2FqgdrmWP252v43cX5RY`.

The goal is one new, isolated workflow for website speaking inquiries. Do not
edit, clone, connect to, or add triggers to the existing book-funnel workflows.
Keep the new workflow in **Draft** until the staging test is ready.

## Before you start

Confirm these items:

- Pipeline: `Speaking Engagements`
- Initial stage: `New Inquiry`
- Workflow assignee: `Damon Young2`
- Internal notification inbox: `info@calebjakes.com`
- Email sending domain: `mg.calebjakes.com` is verified
- HighLevel setting **Allow Multiple Opportunities per Contact** is enabled

HighLevel saves many fields automatically, but use each action's **Save** button
before returning to the workflow canvas.

## Important custom-value rule

The email and task copy below contains markers such as:

`[[INSERT: Opportunity > Website Inquiry ID]]`

Do not leave a marker in the finished workflow and do not type a guessed
HighLevel merge key. Instead:

1. Put the cursor where the marker appears.
2. Delete the entire marker.
3. Click **Custom Values** or the tag/custom-value icon in the editor.
4. Choose the category shown before `>` and then the exact field shown after
   `>`.
5. Confirm HighLevel inserted a colored token/chip into the editor.

For fields such as name, email, and phone, choose the normal **Contact** value.
For event details, choose the named custom field under **Opportunity**. There
are two fields named `Role / Title`; use **Opportunity > Role / Title** in this
workflow because it preserves the value for this particular event inquiry.

If a named Opportunity field does not appear in the custom-value picker, stop
and take a screenshot. Do not substitute a similarly named Contact field.

## 1. Create the isolated workflow

1. In the left menu, open **Automation** and then **Workflows**.
2. Click **Create Workflow** (or **+ Create Workflow**).
3. Choose **Start from Scratch** and create the workflow.
4. Rename it exactly:

   `WEBSITE — SPEAKING INQUIRY`

5. Confirm the top-right state says **Draft**. Do not publish it.
6. Open the workflow **Settings** tab and set its timezone to
   **Eastern Time (US & Canada)** if HighLevel offers a workflow-specific
   timezone. Do not change the location-wide timezone.
7. Return to **Builder**.

## 2. Add the one trigger

1. Click **Add New Trigger**.
2. Search for and select **Opportunity Created**.
3. Set the trigger name to:

   `Website speaking opportunity created`

4. Add this filter:

   - Filter: **In Pipeline**
   - Operator: **Is** or **Equals**
   - Value: **Speaking Engagements**

5. Save the trigger.

Do not add a form trigger, tag trigger, stage-change trigger, or a connection to
`BOOK FUNNEL`. The pipeline filter is what isolates this workflow from Caleb's
existing funnel activity.

## 3. Add the prospect acknowledgement

Click the plus sign below the trigger and add **Send Email**.

Configure it as follows:

| Setting | Value |
| --- | --- |
| Action name | `Acknowledge speaking inquiry` |
| From name | `Caleb Jakes` |
| From email | `info@calebjakes.com` |
| Reply-to email | `info@calebjakes.com` |
| Subject | `We received your Caleb Jakes speaking inquiry — [[INSERT: Opportunity > Website Inquiry ID]]` |

If HighLevel offers a template picker, do not choose an existing book-funnel
template. Use an inline email, or create a new template exclusively for this
workflow. Leave **Sync edits to template** off if that option appears.

Paste this body, then replace every marker through the custom-value picker:

```text
Hello [[INSERT: Contact > First Name]],

We received your speaking inquiry.

Caleb's team will review the event details and follow up using the contact information you provided. No response time is guaranteed.

Inquiry ID: [[INSERT: Opportunity > Website Inquiry ID]]
Organizer: [[INSERT: Contact > Full Name]]
Organization: [[INSERT: Opportunity > Organization]]
Audience: [[INSERT: Opportunity > Audience Type]]
Event type: [[INSERT: Opportunity > Event Type]]
Preferred start date: [[INSERT: Opportunity > Preferred Start Date]]
Preferred end date: [[INSERT: Opportunity > Preferred End Date]]
Location: [[INSERT: Opportunity > Event Location]]
Attendance mode: [[INSERT: Opportunity > Attendance Mode]]
Program length: [[INSERT: Opportunity > Program Length]]
Event goals: [[INSERT: Opportunity > Event Goals]]

This message confirms receipt only. It does not confirm Caleb's availability, pricing, or a booking.

Caleb Jakes
Joyionaire™ Enterprises
info@calebjakes.com
(404) 941-5670

This message contains information submitted through the Caleb Jakes speaking-inquiry form. Do not forward it outside the booking process unless required to plan the event.
```

If **Contact > Full Name** is not offered, use the standard contact full-name
value HighLevel displays. If **Contact > First Name** is empty in a test, the
greeting may simply be changed to `Hello,` rather than adding conditional logic.

Save the action. Do not use **Send Test Email** yet.

## 4. Add the internal notification

Click the plus sign below the prospect email and add
**Send Internal Notification**.

Configure it as follows:

| Setting | Value |
| --- | --- |
| Action name | `Notify info inbox` |
| Notification type | `Email` |
| From name | `Caleb Jakes Website` |
| From email | `info@calebjakes.com` |
| Recipient | Custom/additional email: `info@calebjakes.com` |
| Subject | `Speaking inquiry [[INSERT: Opportunity > Website Inquiry ID]] — [[INSERT: Opportunity > Organization]]` |

The recipient must visibly resolve to `info@calebjakes.com`. Do not select an
arbitrary HighLevel user merely to get past the recipient field. If the action
does not offer a custom/additional email recipient, stop and take a screenshot
of the recipient choices.

Paste this body, then replace every marker through the custom-value picker:

```text
A new speaking inquiry was submitted through calebjakesspeaks.com.

INQUIRY
Inquiry ID: [[INSERT: Opportunity > Website Inquiry ID]]
Opportunity: [[INSERT: Opportunity > Name]]
Opportunity link: [[INSERT: Opportunity > Opportunity Link]]

ORGANIZER
Name: [[INSERT: Contact > Full Name]]
Work email: [[INSERT: Contact > Email]]
Phone: [[INSERT: Contact > Phone]]
Organization: [[INSERT: Opportunity > Organization]]
Role / title: [[INSERT: Opportunity > Role / Title]]

EVENT
Audience type: [[INSERT: Opportunity > Audience Type]]
Other audience type: [[INSERT: Opportunity > Other Audience Type]]
Event type: [[INSERT: Opportunity > Event Type]]
Other event type: [[INSERT: Opportunity > Other Event Type]]
Preferred start date: [[INSERT: Opportunity > Preferred Start Date]]
Preferred end date: [[INSERT: Opportunity > Preferred End Date]]
Estimated audience size: [[INSERT: Opportunity > Estimated Audience Size]]
Event location: [[INSERT: Opportunity > Event Location]]
Attendance mode: [[INSERT: Opportunity > Attendance Mode]]
Program length: [[INSERT: Opportunity > Program Length]]
Event goals: [[INSERT: Opportunity > Event Goals]]
Budget range: [[INSERT: Opportunity > Budget Range]]
Additional details: [[INSERT: Opportunity > Additional Details]]

ATTRIBUTION AND CONSENT
Referral source: [[INSERT: Opportunity > Referral Source]]
Other referral source: [[INSERT: Opportunity > Other Referral Source]]
Privacy consent captured: [[INSERT: Opportunity > Privacy Consent Captured]]
UTM source: [[INSERT: Opportunity > UTM Source]]
UTM medium: [[INSERT: Opportunity > UTM Medium]]
UTM campaign: [[INSERT: Opportunity > UTM Campaign]]
UTM term: [[INSERT: Opportunity > UTM Term]]
UTM content: [[INSERT: Opportunity > UTM Content]]
Referrer path: [[INSERT: Opportunity > Referrer Path]]
```

For the opportunity link, use a standard HighLevel value only if the picker
offers an explicit opportunity URL/link value. If it does not, remove that
entire line. Do not type or construct a dashboard URL manually.

Save the action. Do not send the notification yet.

## 5. Add the follow-up task

Click the plus sign below the internal notification and add **Add Task**.

Configure it as follows:

| Setting | Value |
| --- | --- |
| Action name | `Create speaking inquiry follow-up task` |
| Task title | `Review speaking inquiry [[INSERT: Opportunity > Website Inquiry ID]]` |
| Assign to | `Damon Young2` |
| Due in | `1 day` |
| Skip weekends | Enabled |

Leave the due time at the existing location default. With **Due in: 1 day** and
**Skip weekends** enabled, HighLevel's due-date preview should show the next
business day. Confirm the preview does not land on Saturday or Sunday.

Use this task description and replace its markers through the custom-value
picker:

```text
Review the new website speaking inquiry and contact the organizer manually.

Inquiry ID: [[INSERT: Opportunity > Website Inquiry ID]]
Organizer: [[INSERT: Contact > Full Name]]
Organization: [[INSERT: Opportunity > Organization]]
Email: [[INSERT: Contact > Email]]
Phone: [[INSERT: Contact > Phone]]
Event type: [[INSERT: Opportunity > Event Type]]
Preferred start date: [[INSERT: Opportunity > Preferred Start Date]]
Event location: [[INSERT: Opportunity > Event Location]]

Do not move this contact into the book-funnel workflow. Caleb will send any calendar invitation manually.
```

Save the task action.

## 6. Inspect the finished draft

The canvas must show exactly:

1. One **Opportunity Created** trigger filtered to `Speaking Engagements`
2. **Acknowledge speaking inquiry**
3. **Notify info inbox**
4. **Create speaking inquiry follow-up task**

There must be no waits, branches, SMS, appointments, webhooks, opportunity
creation/update actions, or book-funnel actions.

Confirm all of the following before leaving the page:

- The top-right state still says **Draft**.
- Every `[[INSERT: ...]]` marker has been replaced by a HighLevel token/chip.
- The internal notification visibly targets `info@calebjakes.com`.
- The task visibly names `Damon Young2`, says `1 day`, and has
  **Skip weekends** enabled.
- All three actions show saved status and no warning icons.

Do not click **Publish** and do not click **Test Workflow** yet. The controlled
test is a later step because publishing can send real emails and create a real
task.

## Confirmation to send back

After the draft is saved, report only this checklist (no credentials or
screenshots containing tokens):

```text
Workflow draft saved: Yes
Trigger filtered to Speaking Engagements: Yes
Prospect email action saved: Yes
Internal notification recipient is info@calebjakes.com: Yes
Task assigned to Damon Young2, due in 1 day, Skip weekends enabled: Yes
Every INSERT marker replaced by a HighLevel custom-value token: Yes
Workflow still Draft: Yes
```

If any answer is No, leave the workflow in Draft and share a screenshot of only
the relevant workflow setting.
