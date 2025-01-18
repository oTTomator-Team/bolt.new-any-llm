import { useStore } from '@nanostores/react';
import { useEditChatDescription } from '~/lib/hooks';
import { description as descriptionStore } from '~/lib/persistence';
import Tooltip from '~/components/ui/Tooltip';

export function ChatDescription() {
  const initialDescription = useStore(descriptionStore)!;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription,
      syncWithGlobalStore: true,
    });

  if (!initialDescription) {
    // doing this to prevent showing edit button until chat description is set
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center">
          <input
            type="text"
            className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 mr-2 w-fit"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ width: `${Math.max(currentDescription.length * 8, 100)}px` }}
          />
          <Tooltip content="Save description">
            <button
              type="submit"
              className="i-ph:check-bold scale-110 hover:text-bolt-elements-item-contentAccent"
              onMouseDown={handleSubmit}
            />
          </Tooltip>
        </form>
      ) : (
        <>
          {currentDescription}
          <Tooltip content="Edit description">
            <button
              type="button"
              className="i-ph:pencil-fill scale-110 hover:text-bolt-elements-item-contentAccent"
              onClick={(event) => {
                event.preventDefault();
                toggleEditMode();
              }}
            />
          </Tooltip>
        </>
      )}
    </div>
  );
}
