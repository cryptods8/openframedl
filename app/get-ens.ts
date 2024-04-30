export async function getEnsFromAddress(
  address: string
): Promise<string | null> {
  try {
    const resp = await fetch(`https://ensdata.net/${address}`);
    const data = await resp.json();
    return data?.ens_primary || null;
  } catch (e) {
    console.error("Error fetching ENS data", e);
  }
  return null;
}
