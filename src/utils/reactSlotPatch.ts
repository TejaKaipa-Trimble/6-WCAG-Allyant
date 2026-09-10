/**
 * React can throw insertBefore / removeChild when Stencil projects slotted
 * children. Guard those operations when parentage no longer matches.
 */
export function applyReactSlotPatch(): void {
  if (typeof Node === 'undefined') return

  const proto = Node.prototype as Node & { __modusSlotPatch?: boolean }
  if (proto.__modusSlotPatch) return
  proto.__modusSlotPatch = true

  const originalRemoveChild = proto.removeChild
  proto.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) return child
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = proto.insertBefore
  proto.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

applyReactSlotPatch()
