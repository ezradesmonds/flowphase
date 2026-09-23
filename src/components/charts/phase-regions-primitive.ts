import type {
  ISeriesPrimitive,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  SeriesAttachedParameter,
  UTCTimestamp,
} from "lightweight-charts";
import type { PhaseRegion } from "@/domain/market";
import { PHASE_REGION_STYLES } from "@/lib/phases/styles";

/** Draws in chart coordinates; the library invalidates views on scale/size changes. */
export class PhaseRegionsPrimitive implements ISeriesPrimitive {
  private attachment?: SeriesAttachedParameter;
  private regions: readonly PhaseRegion[] = [];
  private readonly renderer: IPrimitivePaneRenderer = {
    draw: (target) =>
      target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
        const attached = this.attachment;
        if (!attached) return;
        const scale = attached.chart.timeScale();
        const spacing = scale.options().barSpacing;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, mediaSize.width, mediaSize.height);
        ctx.clip();
        for (const region of this.regions) {
          if (region.phase === "INSUFFICIENT_DATA") continue;
          const x1 = scale.timeToCoordinate(
            region.startTimestamp as UTCTimestamp,
          );
          const x2 = scale.timeToCoordinate(
            region.endTimestamp as UTCTimestamp,
          );
          const y1 = attached.series.priceToCoordinate(region.highPrice);
          const y2 = attached.series.priceToCoordinate(region.lowPrice);
          if (x1 === null || x2 === null || y1 === null || y2 === null)
            continue;
          const left = Math.min(x1, x2) - spacing / 2,
            right = Math.max(x1, x2) + spacing / 2;
          // An 18px caption strip above the high keeps labels away from candle bodies.
          const top = Math.min(y1, y2) - 18,
            bottom = Math.max(y1, y2) + 3;
          if (
            right < 0 ||
            left > mediaSize.width ||
            bottom < 0 ||
            top > mediaSize.height
          )
            continue;
          const style = PHASE_REGION_STYLES[region.phase];
          ctx.fillStyle = style.fill;
          ctx.fillRect(left, top, right - left, bottom - top);
          ctx.strokeStyle = style.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(left, top, right - left, bottom - top);
          const labelLeft = Math.max(0, left) + 4,
            labelTop = Math.max(0, top) + 2;
          const width = Math.min(right, mediaSize.width) - labelLeft - 4;
          // Only omit text when the caption is clipped outside the viewport.
          if (width <= 0 || labelTop + 13 > bottom) continue;
          ctx.save();
          ctx.beginPath();
          ctx.rect(labelLeft, labelTop, width, 14);
          ctx.clip();
          ctx.font = "10px Arial";
          ctx.textBaseline = "top";
          const text = `${region.label || style.label} · ${region.confidence}%${region.active ? " · Active" : ""}`;
          const labelWidth = Math.min(width, ctx.measureText(text).width + 6);
          ctx.fillStyle = "rgba(18, 24, 34, 0.75)";
          ctx.fillRect(labelLeft, labelTop, labelWidth, 13);
          ctx.fillStyle = style.border;
          ctx.fillText(
            text,
            labelLeft + 2,
            labelTop + 1,
            Math.max(1, width - 4),
          );
          ctx.restore();
        }
        ctx.restore();
      }),
  };
  private readonly views: IPrimitivePaneView[] = [
    { zOrder: () => "normal", renderer: () => this.renderer },
  ];
  attached(attachment: SeriesAttachedParameter) {
    this.attachment = attachment;
    attachment.requestUpdate();
  }
  detached() {
    this.attachment = undefined;
    this.regions = [];
  }
  setRegions(regions: readonly PhaseRegion[]) {
    this.regions = regions;
    this.attachment?.requestUpdate();
  }
  paneViews() {
    return this.views;
  }
}
