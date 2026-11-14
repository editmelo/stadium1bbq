# Hooking the forms up to a Google Sheet

Start to finish, about ten minutes. Nothing here needs a Vercel account from
Shon — that was only ever needed for the paid email route, which this replaces.

When you're done: someone fills in the catering quote or contact form on the
site, a row appears in your Sheet, and Shon gets an email she can reply to
directly.

Until you're done, nothing breaks. The forms say plainly that they didn't
send and give the phone number, with the customer's answers still on screen.

---

## Decide this first

**Whose Google account owns the Sheet?**

| | Shon's account | Your account |
| --- | --- | --- |
| Who owns the leads | Shon | You, shared with Shon |
| Emails come from | Shon's own account | Your Google account |
| Moving it later | — | Needs the script redeployed |

Shon's is better long term. Moving the script between accounts later means
redeploying it, so it's worth a minute of thought now rather than a migration
in six months.

---

## 1. Make the Sheet

A new, empty Google Sheet. Name it something obvious — `Stadium 1 BBQ —
Website Leads`. You don't need to add any columns; the script creates the
tabs and headers the first time each form is used.

## 2. Add the script

In the Sheet: **Extensions → Apps Script**.

Delete whatever is already in the editor, then paste in the entire contents
of **`forms-apps-script.gs`** (in this same folder).

## 3. Set the secret

Near the top of the script you'll see:

```js
var SECRET = 'PASTE_THE_SAME_SECRET_YOU_PUT_IN_VERCEL';
```

Generate a long random string and paste it in place of that placeholder. In
Terminal:

```
openssl rand -hex 32
```

Keep it on your clipboard or somewhere safe — you need the identical string
in step 5.

> **Put the secret in Apps Script and in Vercel only.** Never paste it into
> `forms-apps-script.gs` in the repo. That file is in version control, and a
> secret committed there is a secret published.

While you're in there, check the line above it:

```js
var NOTIFY = 'stadium1bbq@stadium1bbq.com';
```

That's where lead emails go. Change it if that isn't the right address.

Hit **Save** (the disk icon).

## 4. Deploy it as a web app

**Deploy → New deployment**.

Next to "Select type", click the gear and choose **Web app**. Then set:

- **Execute as:** `Me`
- **Who has access:** `Anyone`

Click **Deploy**.

Google will ask you to authorise it. It's asking for permission to write to
your Sheet and send email from your account — which is exactly what it does.
You may see an "unverified app" warning because you wrote the script
yourself; click through via **Advanced → Go to (project name)**.

Copy the deployment URL. **It must end in `/exec`.**

> If you see a `/dev` URL, that's the test one — it only works for people with
> edit access to the script and always runs unsaved code. You want `/exec`.

## 5. Tell the website about it

Vercel → the **`stadium1bbq`** project → **Settings → Environment Variables**.

Add both, to **Production**:

| Name | Value |
| --- | --- |
| `FORMS_ENDPOINT` | the `/exec` URL from step 4 |
| `FORMS_SECRET` | the same random string from step 3 |

## 6. Redeploy

Vercel → **Deployments** → the most recent one → **⋯ → Redeploy**.

Environment variables only reach a new build, so skipping this means nothing
changes and it looks broken.

## 7. Check it actually works

Go to the live site's **About** page and send yourself a message through the
contact form, using your own real email address.

Within a few seconds you should see:

- a **"Got it — thank you"** message on the page
- a new row in the **Contact** tab of your Sheet
- an email in whichever inbox `NOTIFY` points at

Hit reply on that email — it should address the customer, not the website.

Then do the same on **Catering** with the quote form, which writes to its own
**Catering Quotes** tab.

---

## If something goes wrong

**The page says "not connected yet."** The environment variables aren't
reaching the build. Check both names are spelled exactly as above, that
they're set for Production, and that you redeployed after adding them.

**The page says "that didn't send."** The site reached Google but Google
refused. Nearly always the secret: it must be byte-identical in Apps Script
and in Vercel, with no stray spaces or quotes.

**Nothing arrives but the page says it sent.** Check the Sheet first — if the
row is there, the write worked and it's the email step. Look at **Executions**
in the Apps Script editor for the error.

**Emails stop after a while.** Apps Script allows 100 emails a day from a
personal Gmail account, 1,500 from Google Workspace. Rows keep being written
either way, so no lead is lost.

---

## What's already handled

You don't need to do anything about these.

- **Spam.** A hidden field bots fill in and people never see, plus a limit of
  three submissions a minute per address. Junk is dropped before it reaches
  the Sheet or the inbox.
- **Honesty.** A failed send always says so and gives the phone number. The
  site never claims a message was sent when it wasn't.
- **Reply-To.** Set to the customer, so replying goes to them.
- **Subject lines.** `Catering quote — Maria Tran, 120 guests, Jun 14`, so
  Shon can triage from her phone.
- **Privacy.** The server logs whether a submission was delivered and nothing
  about who sent it.

## If you want to change the form fields

Three places, all of which must agree:

1. the HTML in `catering/index.html` or `about/index.html`
2. `FORMS` in `api/contact.js`
3. `FORMS` in `tools/forms-apps-script.gs`

Then redeploy the script: **Deploy → Manage deployments → edit (pencil) → New
version**. That keeps the same URL, so nothing in Vercel needs changing.

Easier to just ask me.
