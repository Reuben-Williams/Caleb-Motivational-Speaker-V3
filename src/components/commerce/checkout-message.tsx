import Link from "next/link";

export function CheckoutMessage({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="checkout-outcome">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
      <p className="commerce-note">
        Do not start a second payment if you are unsure whether the first one
        completed. Contact info@calebjakes.com for help.
      </p>
      <div className="button-row">
        <Link className="button button--gold" href="/store">
          <span>Return to store</span><span aria-hidden="true">↗</span>
        </Link>
        <Link className="button button--outline" href="/library">
          <span>Customer library</span><span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
