import { dynamicPropertyProxy } from '@/shared/dynamicProperties/server';

export async function GET(request: Request, { params }: { readonly params: Promise<{ path: string[] }> }) {
    return dynamicPropertyProxy(request, (await params).path);
}

export async function PUT(request: Request, { params }: { readonly params: Promise<{ path: string[] }> }) {
    return dynamicPropertyProxy(request, (await params).path);
}
