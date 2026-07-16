import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Image as ImageIcon, Trash2, Video } from 'lucide-react';
import type { MediaItem } from '../../lib/mediaOrder';

type SortableMediaListProps = {
  items: MediaItem[];
  onReorder: (items: MediaItem[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  layout?: 'grid' | 'list';
  showTypeLabel?: boolean;
};

type SortableMediaCardProps = {
  item: MediaItem;
  order: number;
  onRemove: () => void;
  disabled?: boolean;
  layout: 'grid' | 'list';
  showTypeLabel?: boolean;
};

function SortableMediaCard({
  item,
  order,
  onRemove,
  disabled,
  layout,
  showTypeLabel,
}: SortableMediaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.url, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (layout === 'grid') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-primary/40 group ${
          isDragging ? 'opacity-60 z-10 shadow-lg ring-2 ring-accent/40' : ''
        }`}
      >
        {item.type === 'photo' ? (
          <img src={item.url} alt="" className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <video
            src={item.url}
            className="w-full h-full object-cover pointer-events-none bg-black"
            muted
            preload="metadata"
          />
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center shadow-md">
            {item.displayOrder ?? order}
          </div>
          {(item.displayOrder ?? order) === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-semibold text-accent border border-accent/40 shadow-md">
              Portada
            </span>
          )}
        </div>

        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-primary/90 border border-border text-text-light flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          title="Arrastrar para reordenar"
        >
          <GripVertical size={14} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>

        {item.type === 'video' && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-primary/80 text-[10px] text-text-light flex items-center gap-1">
            <Video size={10} />
            Video
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border bg-primary/60 px-3 py-2 ${
        isDragging ? 'opacity-60 z-10 shadow-lg ring-2 ring-accent/40' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="w-8 h-8 rounded-lg border border-border bg-primary text-text-light flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none"
        title="Arrastrar para reordenar"
      >
        <GripVertical size={14} />
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-7 h-7 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">
          {item.displayOrder ?? order}
        </div>
        {(item.displayOrder ?? order) === 1 && (
          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-[10px] font-semibold text-accent border border-accent/30">
            Portada
          </span>
        )}
      </div>

      {item.type === 'photo' ? (
        <img src={item.url} alt="" className="w-14 h-10 rounded object-cover shrink-0" />
      ) : (
        <div className="w-14 h-10 rounded bg-black flex items-center justify-center shrink-0">
          <Video size={16} className="text-accent" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-light truncate">
          {showTypeLabel ? (item.type === 'photo' ? 'Imagen' : 'Video') : ''} #{order}
        </p>
        {item.type === 'photo' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-text-light/70">
            <ImageIcon size={10} />
            Foto
          </span>
        )}
        {item.type === 'video' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-text-light/70">
            <Video size={10} />
            Video
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="text-red-400 hover:text-red-300 shrink-0"
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function SortableMediaList({
  items,
  onReorder,
  onRemove,
  disabled = false,
  layout = 'grid',
  showTypeLabel = false,
}: SortableMediaListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.url === active.id);
    const newIndex = items.findIndex((item) => item.url === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  if (items.length === 0) return null;

  const strategy = layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy;
  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
      : 'space-y-2';

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.url)} strategy={strategy}>
        <div className={containerClass}>
          {items.map((item, index) => (
            <SortableMediaCard
              key={item.url}
              item={item}
              order={index + 1}
              onRemove={() => onRemove(index)}
              disabled={disabled}
              layout={layout}
              showTypeLabel={showTypeLabel}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
