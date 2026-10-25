export type CropCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface CropRegion {
    x: number;
    y: number;
    size: number;
}

export interface CropSelectionProps {
    region: CropRegion;
    disabled: boolean;
    onChange: (region: CropRegion) => void;
    onZoom: (scale: number) => void;
}
