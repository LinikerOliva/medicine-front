import React, { memo, useMemo, useCallback, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

/**
 * Componente de linha otimizado com React.memo
 */
const OptimizedTableRow = memo(({ index, style, data }) => {
  const { items, columns, onRowClick } = data
  const item = items[index]

  const handleClick = useCallback(() => {
    onRowClick?.(item, index)
  }, [item, index, onRowClick])

  return (
    <div style={style}>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleClick}
      >
        {columns.map((column) => (
          <TableCell key={column.key} className={column.className}>
            {typeof column.render === 'function' 
              ? column.render(item[column.key], item, index)
              : item[column.key]
            }
          </TableCell>
        ))}
      </TableRow>
    </div>
  )
})

OptimizedTableRow.displayName = 'OptimizedTableRow'

/**
 * Tabela otimizada com virtualização para grandes volumes de dados
 */
export const OptimizedTable = memo(({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = "Buscar...",
  pageSize = 50,
  height = 400,
  onRowClick,
  loading = false,
  emptyMessage = "Nenhum item encontrado"
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(0)

  // Filtro otimizado com useMemo
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data

    const term = searchTerm.toLowerCase()
    return data.filter(item => 
      columns.some(column => {
        const value = item[column.key]
        return value && String(value).toLowerCase().includes(term)
      })
    )
  }, [data, searchTerm, columns])

  // Paginação otimizada
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // Callbacks otimizados
  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(0) // Reset para primeira página ao buscar
  }, [])

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    const maxPage = Math.ceil(filteredData.length / pageSize) - 1
    setCurrentPage(prev => Math.min(maxPage, prev + 1))
  }, [filteredData.length, pageSize])

  // Dados para o componente virtualizado
  const itemData = useMemo(() => ({
    items: paginatedData,
    columns,
    onRowClick
  }), [paginatedData, columns, onRowClick])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  if (loading) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              disabled
              className="max-w-sm"
            />
          </div>
        )}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.headerClassName}>
                    {column.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      {searchable && (
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>

        {paginatedData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <List
            height={height}
            itemCount={paginatedData.length}
            itemSize={60}
            itemData={itemData}
          >
            {OptimizedTableRow}
          </List>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {currentPage * pageSize + 1} a {Math.min((currentPage + 1) * pageSize, filteredData.length)} de {filteredData.length} itens
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

OptimizedTable.displayName = 'OptimizedTable'

/**
 * Hook para usar com OptimizedTable
 */
export function useOptimizedTable(initialData = []) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  const updateData = useCallback((newData) => {
    setData(newData)
  }, [])

  const addItem = useCallback((item) => {
    setData(prev => [...prev, item])
  }, [])

  const removeItem = useCallback((index) => {
    setData(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback((index, updatedItem) => {
    setData(prev => prev.map((item, i) => i === index ? updatedItem : item))
  }, [])

  return {
    data,
    loading,
    setLoading,
    updateData,
    addItem,
    removeItem,
    updateItem
  }
}