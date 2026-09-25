"use client";

import { useId, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

export function FaqList({
  items,
  allowMultiple = true,
  regionIds,
}: {
  items: readonly FaqItem[];
  allowMultiple?: boolean;
  regionIds?: readonly { question: string; answer: string }[];
}) {
  const baseId = useId();
  const [openItems, setOpenItems] = useState<Set<number>>(() => new Set());

  const toggleItem = (index: number) => {
    setOpenItems((current) => {
      const next = allowMultiple ? new Set(current) : new Set<number>();
      if (current.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openItems.has(index);
        const panelId = `${baseId}-faq-${index}`;
        return (
          <article className="faq-item" data-open={isOpen} key={item.question}>
            <h3>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                onClick={() => toggleItem(index)}
                type="button"
              >
                <span
                  {...(regionIds?.[index] ? {
                    "data-builder-region-id": regionIds[index].question,
                    "data-builder-region-kind": "text",
                    "data-builder-region-value": item.question,
                  } : {})}
                >{item.question}</span>
                <span aria-hidden="true" className="faq-item__symbol">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              className="faq-item__answer"
              hidden={!isOpen}
              id={panelId}
            >
              <p
                {...(regionIds?.[index] ? {
                  "data-builder-region-id": regionIds[index].answer,
                  "data-builder-region-kind": "text",
                  "data-builder-region-value": item.answer,
                } : {})}
              >{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
