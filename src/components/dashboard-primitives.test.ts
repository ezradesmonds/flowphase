import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PhaseDonutChart, type PhaseSlice } from "./dashboard-primitives";

it("renders contiguous donut segments consistently across repeated renders", () => {
  const slices: PhaseSlice[] = [2, 3, 5].map((count, index) => ({
    phase: String(index),
    label: String(index),
    count,
    percentage: count * 10,
    color: "#ffffff",
  }));
  const render = () =>
    renderToStaticMarkup(createElement(PhaseDonutChart, { slices, total: 10 }));
  const html = render();
  const circumference = 2 * Math.PI * 76;
  for (const fraction of [0, 0.2, 0.5]) {
    expect(html).toContain(
      `stroke-dashoffset="${(-fraction * circumference).toFixed(2)}"`,
    );
  }
  expect(render()).toBe(html);
  expect(
    renderToStaticMarkup(
      createElement(PhaseDonutChart, { slices: [], total: 0 }),
    ),
  ).not.toMatch(/NaN|Infinity/);
});
