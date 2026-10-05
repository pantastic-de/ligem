import { ResultsLoading } from "@/components/results-loading";

export default function Loading() {
  return (
    <ResultsLoading
      title="Termine"
      intro="Aktuelle Veranstaltungen und Aktionen auf LiGem."
      label="Termine werden geladen …"
    />
  );
}
