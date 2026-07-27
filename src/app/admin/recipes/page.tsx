import { BookOpen } from "lucide-react";
import { RecipeWorkbench } from "@/components/recipe-workbench";

export default function RecipesPage() {
	return (
		<div>
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center gap-3 px-4 py-6">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
						<BookOpen className="h-6 w-6 text-primary-foreground" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">Recipes</h1>
						<p className="text-muted-foreground text-sm">
							Immutable BeerJSON 1.0 revisions with BeerXML interchange
						</p>
					</div>
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<RecipeWorkbench />
			</main>
		</div>
	);
}
