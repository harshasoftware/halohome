# Importing GEDCOM Files

GEDCOM is a standard format for family tree data. TheModernFamily lets you import GEDCOM files to quickly build your tree.

## How to Import
1. Click the **Import** button in the toolbar or sidebar.
2. Select your GEDCOM (.ged) file.
3. The app will process the file and add people, unions, and relationships to your tree.

## How Relationships Are Mapped
- **Marriages/Partnerships**: Become union nodes with appropriate relationship lines.
- **Parent-child**: Mapped as parent-to-union and union-to-child edges.
- **Divorces, adoptions, etc.**: Mapped according to the conventions in [Understanding Relationship Conventions](./understanding-relationship-conventions.md).

## Troubleshooting
- If you see errors, check that your GEDCOM file is valid and not too large.
- Some complex relationships may need manual adjustment after import. 