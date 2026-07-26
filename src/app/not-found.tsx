import { LinkButton } from "@/components/link-button";

export default function NotFound() {
  return (
    <section className="simple-state">
      <p className="eyebrow">404 · OFF STAGE</p>
      <h1>THIS PAGE COULDN’T BE FOUND.</h1>
      <p>The message is still here. Let’s get you back to the main stage.</p>
      <LinkButton href="/">Return Home</LinkButton>
    </section>
  );
}

