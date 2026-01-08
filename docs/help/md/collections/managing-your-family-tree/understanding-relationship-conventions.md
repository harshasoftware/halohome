# Understanding Relationship Conventions

TheModernFamily uses clear visual conventions to represent different types of relationships. Use this guide to interpret and create relationships accurately.

![Relationship Conventions](../../../../docs/relationship-conventions.svg)

## Legend
- **Person Node**: Rounded rectangle. Color indicates status (alive, deceased, etc.).
- **Union Node**: Small gray rectangle. Represents a partnership (marriage, common-law, etc.).

## Relationship Lines
- **Marriage**: Solid pink line (#ec4899)
- **Divorce**: Dashed red line (#ef4444, 5,5)
- **Separated**: Dashed orange line (#f97316, 10,5)
- **Common-law**: Dashed gold line (#a16207, 2,2)
- **Engaged**: Dashed magenta line (#db2777, 4,4)
- **Dating**: Solid light pink line (#fb7185)
- **Ex-partner**: Dashed gray line (#a8a29e, 4,4)
- **Parent-to-union**: Solid blue line (#3b82f6) from person to union node
- **Union-to-child**: Solid blue line (#3b82f6) from union node to child
- **Step-child**: Dashed blue line (#3b82f6, 2,3)
- **Adoption**: Dashed blue line (#3b82f6, 5,5)
- **Godparent/Guardian**: Dashed green line (#059669, 3,3)
- **Default/Other**: Solid slate line (#64748b)

## How to Create Each Relationship
- **Partner relationships**: Connect two people using side handles (marriage-right/marriage-left).
- **Parent-child**: Connect union node to child (bottom handle to top handle).
- **Step/adoptive**: Use the Relationship Type Modal to select the correct type.

Refer to the diagram above for a visual reference of each relationship type. 