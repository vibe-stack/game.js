import SceneObjectNew from "../scene-object-new";
import Grid2 from "./grid2";

export function SceneRenderer({
  scene,
  selectedObjects,
  onSelectObject,
}: {
  scene: GameScene;
  selectedObjects: string[];
  onSelectObject: (id: string, event?: React.MouseEvent) => void;
}) {
  const { editorConfig } = scene;

  return (
    <>
      {editorConfig.showHelperGrid && (
        <Grid2
          args={[editorConfig.gridSize || 10, editorConfig.gridSize || 10]}
        />
      )}

      {scene.objects.map((obj) => (
        <SceneObjectNew
          key={obj.id}
          objectId={obj.id}
          selectedObjects={selectedObjects}
          onSelect={onSelectObject}
          renderType={editorConfig.renderType}
        />
      ))}
    </>
  );
}