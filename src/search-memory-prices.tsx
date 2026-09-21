import { Action, ActionPanel, Cache, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ageInDays, isStale, loadProducts, searchKeywords, STALE_AFTER_DAYS } from "./lib/data";
import { aboveLow, buyStateShort, BUY_STATE_LABEL, historyTable, longDate, money } from "./lib/format";
import type { Product } from "./lib/types";

const cache = new Cache();

type CategoryFilter = "all" | "ram" | "ssd";

const STATE_COLOR: Record<string, Color> = {
  good: Color.Green,
  typical: Color.SecondaryText,
  elevated: Color.Orange,
};

export default function SearchMemoryPrices() {
  const [showingDetail, setShowingDetail] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");

  const { data, isLoading, revalidate, error } = usePromise(
    async () => {
      const result = await loadProducts({ cache });
      if (result.servedFromCacheAfterFailure) {
        // Degrading is not silent: say what happened and how old the data is.
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't refresh prices",
          message: `Showing data computed ${longDate(result.payload.generated)}`,
        });
      }
      return result;
    },
    [],
    { failureToastOptions: { title: "Couldn't load prices" } },
  );

  const payload = data?.payload;
  const products = payload?.products ?? [];
  const filtered = category === "all" ? products : products.filter((p) => p.category === category);

  // The date the data was computed rides every view, on the section header,
  // because the site refreshes six times a day and this file does not.
  const stale = payload ? isStale(payload.generated) : false;
  const offline = data?.servedFromCacheAfterFailure ?? false;
  let sectionTitle = "";
  if (payload) {
    const age = ageInDays(payload.generated);
    const dated = `data from ${longDate(payload.generated)}`;
    sectionTitle = `${filtered.length} products · ${dated}`;
    if (offline) sectionTitle = `Offline · ${sectionTitle}`;
    if (stale) sectionTitle = `⚠ ${age} days old · ${sectionTitle}`;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search by name, brand or ASIN"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" storeValue onChange={(v) => setCategory(v as CategoryFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="RAM" value="ram" />
          <List.Dropdown.Item title="SSDs" value="ssd" />
        </List.Dropdown>
      }
    >
      {error && !payload ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't load prices"
          description={`${error.message}. Check your connection, then try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Memradar" url="https://memradar.com" />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={sectionTitle}>
          {filtered.map((product) => (
            <ProductItem
              key={product.sku}
              product={product}
              payloadGenerated={payload?.generated ?? ""}
              attribution={payload?.attribution ?? ""}
              notice={payload?.notice ?? ""}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail((v) => !v)}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ProductItem(props: {
  product: Product;
  payloadGenerated: string;
  attribution: string;
  notice: string;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { product, showingDetail } = props;
  const state = product.buy_state;

  return (
    <List.Item
      title={product.name}
      subtitle={showingDetail ? undefined : product.brand}
      keywords={searchKeywords(product)}
      icon={product.category === "ram" ? Icon.MemoryChip : Icon.HardDrive}
      accessories={
        showingDetail
          ? undefined
          : [
              ...(state ? [{ tag: { value: buyStateShort(state) ?? "", color: STATE_COLOR[state] } }] : []),
              { text: money(product.price_usd) },
            ]
      }
      detail={<ProductDetail {...props} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Memradar" url={product.url} icon={Icon.Globe} />
          <Action.CopyToClipboard title="Copy Price" content={money(product.price_usd)} />
          {product.all_time_low ? (
            <Action.CopyToClipboard title="Copy All-Time Low" content={money(product.all_time_low.price_usd)} />
          ) : null}
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={props.onToggleDetail}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function ProductDetail({
  product,
  payloadGenerated,
  attribution,
  notice,
}: {
  product: Product;
  payloadGenerated: string;
  attribution: string;
  notice: string;
}) {
  const markdown = [`## Monthly price history`, "", historyTable(product), "", `---`, "", notice, "", attribution]
    .join("\n")
    .trim();

  const low = product.all_time_low;
  const high = product.all_time_high;
  const above = aboveLow(product);
  const stale = payloadGenerated ? isStale(payloadGenerated) : false;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Current price" text={money(product.price_usd)} />
          {product.buy_state ? (
            <List.Item.Detail.Metadata.TagList title="Buy state">
              <List.Item.Detail.Metadata.TagList.Item
                text={BUY_STATE_LABEL[product.buy_state]}
                color={STATE_COLOR[product.buy_state]}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {low ? (
            <List.Item.Detail.Metadata.Label
              title="All-time low"
              text={`${money(low.price_usd)} · ${longDate(low.date)}`}
            />
          ) : null}
          {above ? <List.Item.Detail.Metadata.Label title="Against that low" text={above} /> : null}
          {high ? (
            <List.Item.Detail.Metadata.Label
              title="All-time high"
              text={`${money(high.price_usd)} · ${longDate(high.date)}`}
            />
          ) : null}
          {product.avg_90d_usd !== undefined ? (
            <List.Item.Detail.Metadata.Label title="90-day average" text={money(product.avg_90d_usd)} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Tracked" text={`${product.tracked_days} days`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Data computed"
            text={payloadGenerated ? longDate(payloadGenerated) : "unknown"}
            icon={stale ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
          />
          {stale ? (
            <List.Item.Detail.Metadata.Label
              title="Warning"
              text={`More than ${STALE_AFTER_DAYS} days old; the site may have newer prices`}
            />
          ) : null}
          <List.Item.Detail.Metadata.Link title="Product page" target={product.url} text="memradar.com" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
