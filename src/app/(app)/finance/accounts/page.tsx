import { AccountsManager } from "@/components/finance/AccountsManager";
import { getAccountsWithBalances } from "@/lib/finance";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const accounts = await getAccountsWithBalances();
  return <AccountsManager accounts={accounts} />;
}
