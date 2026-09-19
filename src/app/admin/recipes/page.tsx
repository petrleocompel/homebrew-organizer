import { PageHeader } from "@/components/page-header";
import { RecipeWorkbench } from "@/components/recipe-workbench";

export default function RecipesPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Recipes"
				description="Immutable BeerJSON 1.0 revisions with BeerXML interchange"
			/>
			<RecipeWorkbench />
		</div>
	);
}
