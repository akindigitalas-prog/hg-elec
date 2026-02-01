import { listProducts } from '@/lib/data';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductDialog } from '@/app/catalogue/product-dialog';
import { ProductImportDialog } from '@/app/catalogue/product-import-dialog';
import { ProductPriceDialog } from '@/app/catalogue/product-price-dialog';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/lib/constants';

export default async function CataloguePage() {
  const products = await listProducts();
  const categories = ['all', ...PRODUCT_CATEGORIES] as const;

  const renderTable = (items: typeof products) => (
    <Table className="table-sticky">
      <TableHeader>
        <TableRow>
          <TableHead>Libelle</TableHead>
          <TableHead>Marque</TableHead>
          <TableHead className="text-right">Prix</TableHead>
          <TableHead className="text-right">Cout</TableHead>
          <TableHead>Categorie</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>TVA</TableHead>
          <TableHead className="text-right">Actif</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              Aucun article dans cette categorie.
            </TableCell>
          </TableRow>
        ) : (
          items.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.brand || '—'}</TableCell>
              <TableCell className="text-right">
                {Number.isFinite(product.internal_unit_price)
                  ? `${product.internal_unit_price.toFixed(2)} EUR`
                  : '—'}
              </TableCell>
              <TableCell className="text-right">
                {Number.isFinite(product.internal_cost ?? NaN)
                  ? `${Number(product.internal_cost).toFixed(2)} EUR`
                  : '—'}
              </TableCell>
              <TableCell>{PRODUCT_CATEGORY_LABELS[product.category] || product.category}</TableCell>
              <TableCell>
                <Badge variant="secondary">{product.type}</Badge>
              </TableCell>
              <TableCell>{product.vat_rate}%</TableCell>
              <TableCell className="text-right">
                {product.active ? 'Oui' : 'Non'}
              </TableCell>
              <TableCell className="text-right">
                <ProductPriceDialog
                  product={{
                    id: product.id,
                    name: product.name,
                    internal_unit_price: product.internal_unit_price,
                    internal_cost: product.internal_cost ?? null,
                  }}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue"
        description="Base de prix de vente et articles par categorie."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/api/products/export">Exporter CSV</a>
            </Button>
            <ProductImportDialog />
            <ProductDialog />
          </>
        }
      />

      <SectionCard
        title="Recherche rapide"
        action={<Input placeholder="Rechercher un article" className="w-56" />}
      >
        <Tabs defaultValue="all">
          <TabsList>
            {categories.map((category) => {
              const label =
                category === 'all' ? 'Tous' : PRODUCT_CATEGORY_LABELS[category] || category;
              return (
                <TabsTrigger key={category} value={category}>
                  {label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="all">{renderTable(products)}</TabsContent>
          {PRODUCT_CATEGORIES.map((category) => (
            <TabsContent key={category} value={category}>
              {renderTable(products.filter((product) => product.category === category))}
            </TabsContent>
          ))}
        </Tabs>
      </SectionCard>
    </div>
  );
}

