export interface NightfireBlockOptionInput {
	type: string;
	label: string;
	category?: string;
	subcategory?: string;
}

export interface GroupedOptions {
	category: string | null;
	label: string;
	options: NightfireBlockOptionInput[];
}

const CATEGORY_PRIORITY: Record<string, number> = {
	Text: 1,
	Media: 2
};

function getCategoryPriority(category: string | null): number {
	if (category === null) return 999;
	return CATEGORY_PRIORITY[category] ?? 100;
}

export function buildGroupedOptions(
	options: NightfireBlockOptionInput[]
): GroupedOptions[] {
	const groups = new Map<string | null, NightfireBlockOptionInput[]>();

	for (const option of options) {
		const key = option.category ?? null;
		const existing = groups.get(key) ?? [];
		existing.push(option);
		groups.set(key, existing);
	}

	const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
		const priorityA = getCategoryPriority(a);
		const priorityB = getCategoryPriority(b);
		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}
		return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
	});

	return sortedKeys.map((key) => {
		const grouped = groups.get(key)!;
		grouped.sort((a, b) => {
			const priorityA = getSubcategoryPriority(a);
			const priorityB = getSubcategoryPriority(b);
			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}

			const subA = String(a.subcategory ?? "").toLowerCase();
			const subB = String(b.subcategory ?? "").toLowerCase();
			const subCompare = subA.localeCompare(subB);
			if (subCompare !== 0) return subCompare;
			return a.label.localeCompare(b.label);
		});
		return {
			category: key,
			label: key ? formatCategoryLabel(key) : "Other",
			options: grouped
		};
	});
}

function getSubcategoryPriority(option: NightfireBlockOptionInput): number {
	return option.subcategory ? 100 : 0;
}

function formatCategoryLabel(input: string): string {
	const spaced = input
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!spaced) {
		return input;
	}

	return spaced
		.split(" ")
		.map((part) => {
			if (part.length <= 4 && part === part.toUpperCase()) {
				return part;
			}
			const lower = part.toLowerCase();
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(" ");
}
